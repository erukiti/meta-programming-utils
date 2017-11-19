import test from 'ava'
import { transform } from 'babel-core'
import { format } from 'prettier'
import { replaceCallExpression } from './replace-call-expression'

const getPlugin = templ => {
  return babel => {
    return {
      visitor: {
        CallExpression: (nodePath, state) => {
          replaceCallExpression(babel, nodePath, templ, 'hoge.js')
        }
      }
    }
  }
}

test('default', t => {
  const src = 'console.log(1)'

  const templ = `debugLog({filename: FILENAME, line: START_LINE, column: START_COLUMN, type: 'log', callee: CALLEE, calleeName: CALLEE_NAME}, ARGS)`

  const expected = format(
    `debugLog({filename: "hoge.js", line: 1, column: 1, type: 'log', callee: console.log, calleeName: "console.log"}, 1)`
  )

  const plugin = getPlugin(templ)

  const { code } = transform(src, { plugins: [[plugin]] })
  t.true(expected === format(code))
})
