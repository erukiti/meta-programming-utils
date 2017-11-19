import { NodePath } from './types'

/**
 * type Opts
 * @param babel - user's babel object (ex. import * babel from '@babel/core')
 * @param {string} enter - source code hook when entering the function
 * @param {string} exit - source code hook when exiting the function
 * @param {string} filename - filename
 */

const ENTER_DEFAULT = 'console.log(`enter ${NAME}: ${FILENAME}:${START_LINE}:${START_COLUMN}`, {params: PARAMS})'
const EXIT_DEFAULT = 'console.log(`exit  ${NAME}: ${FILENAME}:${END_LINE}:${END_COLUMN}`, {result: RESULT})'

export const hookFunction = (
  babel,
  nodePath: NodePath,
  name: string,
  filename: string,
  enter: string,
  exit: string
) => {
  const { types: t, template, traverse } = babel

  if (!nodePath.node || !nodePath.node.loc) {
    return
  }

  const n = nodePath.node

  const populate = (templateSource: string, replacements = {}) => {
    const replacements2 = {
      FILENAME: t.stringLiteral(filename),
      NAME: t.stringLiteral(name),
      START_LINE: t.numericLiteral(n.loc.start.line),
      START_COLUMN: t.numericLiteral(n.loc.start.column + 1),
      END_LINE: t.numericLiteral(n.loc.end.line),
      END_COLUMN: t.numericLiteral(n.loc.end.column + 1),
      RESULT: t.nullLiteral(),
      ...replacements
    }
    const excludeKeys = Object.keys(replacements2).filter(key => !templateSource.includes(key))
    excludeKeys.forEach(key => delete replacements2[key])
    return template(templateSource)(replacements2)
  }

  const populateEnter = (replacements = {}) => populate(enter || ENTER_DEFAULT, replacements)
  const populateExit = (replacements = {}) => populate(exit || EXIT_DEFAULT, replacements)

  const params = t.ObjectExpression(
    n.params.map(param => {
      if (t.isIdentifier(param)) {
        return t.objectProperty(param, param, false, true)
      } else if (t.isAssignmentPattern(param) && t.isIdentifier(param.left)) {
        return t.objectProperty(param.left, param.left, false, true)
      } else if (t.isRestElement(param)) {
        return t.objectProperty(param.argument, param.argument, false, true)
      }
      throw new Error(`unknown param ${param}`)
    })
  )
  const nodeEnter = populateEnter({ PARAMS: params })
  const body = nodePath.get('body')
  let newAst
  if (nodePath.type === 'ArrowFunctionExpression' && body.isExpression()) {
    const uid = nodePath.scope.generateUidIdentifier()
    const bodies = [
      nodeEnter,
      t.variableDeclaration('const', [t.variableDeclarator(uid, body.node)]),
      populateExit({ RESULT: uid }),
      t.returnStatement(uid)
    ]
    newAst = t.blockStatement(bodies)
    body.replaceWith(newAst)
  } else if (body.isBlockStatement()) {
    const bodies = [nodeEnter, ...body.node.body]
    body.node.body = bodies
    body.traverse({
      Function: innerPath => {
        innerPath.stop()
      },
      ReturnStatement: innerPath => {
        if (!innerPath.node || !innerPath.node.loc) {
          return
        }

        const scope = nodePath.parentPath.scope

        if (!innerPath.node.argument) {
          innerPath.insertBefore(populateExit())
        } else {
          const uid = scope.generateUidIdentifier()

          const b2 = [
            t.variableDeclaration('const', [t.variableDeclarator(uid, innerPath.node.argument)]),
            populateExit({ RESULT: uid }),
            t.returnStatement(uid)
          ]
          innerPath.replaceWithMultiple(b2)
        }
      }
    })

    if (!t.isReturnStatement(body.node.body[body.node.body.length - 1])) {
      body.pushContainer('body', populateExit())
    }
  }

  const toLiteral = {
    string: value => t.stringLiteral(value),
    number: value => t.numericLiteral(value),
    boolean: value => t.booleanLiteral(value),
    null: value => t.nullLiteral()
  }

  const valueToLiteral = value => {
    if (!toLiteral[typeof value]) {
      return null
    }
    return toLiteral[typeof value](value)
  }

  nodePath.traverse({
    exit: innerPath => {
      if (t.isImmutable(innerPath)) {
        return
      }
      const { confident, value } = innerPath.evaluate()
      if (confident && typeof value !== 'object') {
        const node = valueToLiteral(value)
        if (node) {
          innerPath.replaceWith(node)
        }
      }
    }
  })
}
