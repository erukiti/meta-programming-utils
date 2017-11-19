import { transform } from '@babel/core'
import generate from '@babel/generator'
import traverse from '@babel/traverse'
import test from 'ava'
import { parse } from 'babylon'
import { hookFunction } from './hook-function'

// import { getNodePath } from './nodepath'

import * as babel from '@babel/core'
import { NodePathUtility } from './'

const filename = 'hoge.js'
const util = new NodePathUtility({ babel, filename })
const getNodePath = util.getNodePath.bind(util)

const injection = (src: string, enter?: string, exit?: string) => {
  const plugin = () => {
    return {
      visitor: {
        Function: (nodePath, state) => {
          hookFunction(babel, nodePath, 'HOGE', filename, enter, exit)
        }
      }
    }
  }

  return transform(src.trim(), { plugins: [plugin] }).code
}

const f = src => transform(src).code

test('arrow expression', t => {
  const src = 'const f = (a, b) => a + 1'

  const expected = `
    const f = (a, b) => {
      console.log("enter HOGE: hoge.js:1:11", {params: {a, b}})
      const _temp = a + 1
      console.log("exit  HOGE: hoge.js:1:26", {result: _temp})
      return _temp
    }
    `

  const code = injection(src)
  t.true(f(expected) === code)
})

test('arrow function with opts', t => {
  const src = 'const f = a => a + 1'

  const enter = 'debug(NAME, FILENAME, START_LINE, START_COLUMN, END_LINE, END_COLUMN)'
  const exit = 'debug()'

  const expected = `
    const f = a => {
      debug("HOGE", "hoge.js", 1, 11, 1, 21)
      const _temp = a + 1
      debug()
      return _temp
    }
    `

  const code = injection(src, enter, exit)
  t.true(f(expected) === code)
})

test('arrow function without return value', t => {
  const src = 'const f = a => {a + 1}'

  const enter = 'enter(PARAMS)'
  const exit = 'exit(RESULT)'

  const expected = `
    const f = a => {
      enter({a})
      a + 1
      exit(null)
    }
    `

  const code = injection(src, enter, exit)
  t.true(f(expected) === code)
})

test('arrow function with block and return value', t => {
  const src = `
    const f = a => {
        return a + 1
    }
    `

  const enter = 'enter()'
  const exit = 'exit()'

  const expected = `
    const f = a => {
      enter()
      const _temp = a + 1
      exit()
      return _temp
    }
    `

  const code = injection(src, enter, exit)
  t.true(f(expected) === code)
})

test('arrow function with multiple return', t => {
  const src = `
    const f = a => {
      if (a < 0) {
        return a - 1
      } else {
        return a + 1
      }
    }
    `

  const enter = 'enter()'
  const exit = 'exit()'

  const expected = `
    const f = a => {
      enter()
      if (a < 0) {
        const _temp = a - 1
        exit()
        return _temp
      } else {
        const _temp2 = a + 1
        exit()
        return _temp2
      }
      exit()
    }
    `

  const code = injection(src, enter, exit)
  t.true(f(expected) === code)
})

test('arrow function nest', t => {
  const src = `
    const f = a => {
      const b = () => 1
      return a + b()
    }`

  const enter = 'enter(START_LINE)'
  const exit = 'exit(END_LINE)'

  const expected = `
    const f = a => {
      enter(1)

      const b = () => {
        enter(2)
        const _temp2 = 1
        exit(2)
        return _temp2
      }

      const _temp = a + b()
      exit(4)
      return _temp
    }
    `

  const code = injection(src, enter, exit)
  t.true(f(expected) === code)
})

test('rest param', t => {
  const src = 'const f = (a, ...b) => a + 1'

  const expected = `
    const f = (a, ...b) => {
      console.log("enter HOGE: hoge.js:1:11", {params: {a, b}})
      const _temp = a + 1
      console.log("exit  HOGE: hoge.js:1:29", {result: _temp})
      return _temp
    }
    `

  const code = injection(src)
  t.true(f(expected) === code)
})
