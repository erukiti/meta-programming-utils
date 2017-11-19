import { parse } from 'babylon'
import { File } from '@babel/core'
import traverse from '@babel/traverse'

const parseMainSourceVisitor = {
  Program: (nodePath, state) => {
    state.result.nodePath = nodePath
  }
}

export const getNodePath = (filename: string, source: string) => {
  const result = { nodePath: <any>null }

  const visitor = parseMainSourceVisitor
  const ast = parse(source, { plugins: ['flow'], sourceFilename: filename, sourceType: 'module' })
  const file = new File({}, { code: source, ast })
  traverse(file.ast, visitor, file.scope, { result })
  return result.nodePath
}
