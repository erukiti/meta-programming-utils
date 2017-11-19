import { NodePath } from '@babel/traverse'
const assert = require('assert')

export const replaceCallExpression = (babel, nodePath: NodePath, templateSource: string, filename: string) => {
  if (!nodePath.node || !nodePath.node.loc) {
    return
  }

  assert(nodePath.type === 'CallExpression')

  const { types: t, template } = babel

  const n = nodePath.node
  const callee = nodePath.get('callee')

  const replacements = {
    FILENAME: t.stringLiteral(filename),
    START_LINE: t.numericLiteral(n.loc.start.line),
    START_COLUMN: t.numericLiteral(n.loc.start.column + 1),
    END_LINE: t.numericLiteral(n.loc.end.line),
    END_COLUMN: t.numericLiteral(n.loc.end.column + 1),
    ARGS: nodePath.node.arguments,
    CALLEE_NAME: t.stringLiteral(callee.getSource() || 'unknown'),
    CALLEE: callee.node
  }

  const excludeKeys = Object.keys(replacements).filter(key => !templateSource.includes(key))
  excludeKeys.forEach(key => delete replacements[key])

  nodePath.replaceWith(template(templateSource)(replacements))
}
