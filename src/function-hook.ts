import * as babel from '@babel/core'

export type NodePath = {
  type: string
  [props: string]: any
}

export type Opts = {
  babel?: any
  enter?: string
  exit?: string
  filename?: string
  file?: { opts: { filename: string } }
}

export class Injector {
  private _babel
  private _filename: string
  private _populateEnter
  private _populateExit

  constructor(opts: Opts = {}) {
    this._babel = opts.babel || babel

    const populate = (templateSource: string, name: string, n, replacements = {}) => {
      const { types: t } = this._babel
      const replacements2 = {
        FILENAME: t.stringLiteral(this._filename),
        NAME: t.stringLiteral(name),
        START_LINE: t.numericLiteral(n.loc.start.line),
        START_COLUMN: t.numericLiteral(n.loc.start.column + 1),
        END_LINE: t.numericLiteral(n.loc.end.line),
        END_COLUMN: t.numericLiteral(n.loc.end.column + 1),
        RESULT: t.nullLiteral(),
        ...replacements,
      }
      const excludeKeys = Object.keys(replacements2).filter(key => !templateSource.includes(key))
      excludeKeys.forEach(key => delete replacements2[key])
      return this._babel.template(templateSource)(replacements2)
    }

    const enter = opts.enter || 'console.log(`enter ${NAME}: ${FILENAME}:${START_LINE}:${START_COLUMN}`, {params: PARAMS})'
    const exit = opts.exit || 'console.log(`exit  ${NAME}: ${FILENAME}:${END_LINE}:${END_COLUMN}`, {result: RESULT})'
    this._populateEnter = (name: string, node, replacements = {}) => populate(enter, name, node, replacements)
    this._populateExit = (name: string, node, replacements = {}) => populate(exit, name, node, replacements)

    if (opts.filename) {
      this._filename = opts.filename
    } else if (opts.file) {
      this._filename = opts.file.opts.filename
    } else {
      this._filename = 'unknown'
    }
  }

  injectionToFunction(nodePath: NodePath, name: string) {
    if (!nodePath.node || !nodePath.node.loc) {
      return
    }

    const { types: t, template, traverse } = this._babel

    const n = nodePath.node

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

    const nodeEnter = this._populateEnter(name, n, { PARAMS: params })
    const body = nodePath.get('body')

    let newAst
    if (nodePath.type === 'ArrowFunctionExpression' && body.isExpression()) {
      const uid = nodePath.scope.generateUidIdentifier()
      const bodies = [
        nodeEnter,
        t.variableDeclaration('const', [t.variableDeclarator(uid, body.node)]),
        this._populateExit(name, n, { RESULT: uid }),
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
            innerPath.insertBefore(this._populateExit(name, n))
          } else {
            const uid = scope.generateUidIdentifier()

            const b2 = [
              t.variableDeclaration('const', [t.variableDeclarator(uid, innerPath.node.argument)]),
              this._populateExit(name, n, { RESULT: uid }),
              t.returnStatement(uid)
            ]
            innerPath.replaceWithMultiple(b2)
          }
        }
      })

      if (!t.isReturnStatement(body.node.body[body.node.body.length - 1])) {
        body.pushContainer('body', this._populateExit(name, n))
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
}
