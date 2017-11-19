import * as babel from '@babel/core'
import { hookFunction } from './hook-function'
import { replaceCallExpression } from './replace-call-expression'
import { NodePath } from './types'
export { getSelectors } from './get-selectors'

export interface NodePathUtilityOpts {
  babel?: any
  filename?: string
}

export class NodePathUtility {
  private _babel
  private _filename: string = 'unknown'

  constructor(opts: NodePathUtilityOpts = {}) {
    this._babel = opts.babel || babel
    this._filename = opts.filename
  }

  public replaceCallExpression(nodePath: NodePath, templateSource) {
    return replaceCallExpression(this._babel, nodePath, templateSource, this._filename)
  }

  public hookFunction(nodePath: NodePath, functionName: string, enter?: string, exit?: string) {
    hookFunction(this._babel, nodePath, functionName, this._filename, enter, exit)
  }

  public getNodePath(source: string) {
    const result: { nodePath: NodePath } = { nodePath: null }

    const plugin = () => ({
      visitor: {
        Program: (nodePath: NodePath) => {
          result.nodePath = nodePath
        }
      }
    })
    babel.transform(source, { plugins: [plugin] })
    return result.nodePath
  }
}
