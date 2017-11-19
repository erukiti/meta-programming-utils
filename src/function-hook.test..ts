import test from 'ava'
import { transform } from '@babel/core'
import { parse } from 'babylon'
import traverse from '@babel/traverse'
import generate from '@babel/generator'
import { Injector } from './function-hook'
import { getNodePath } from './get-node-path'

const injection = (src, opts) => {
  let injector: Injector
  const plugin = babel => {
    return {
      visitor: {
        Function: (nodePath, state) => {
          injector.injectionToFunction(nodePath, 'HOGE')
        }
      },
      pre() {
        injector = new Injector({ babel, ...opts })
      }
    }
  }

  return transform(src.trim(), { plugins: [plugin] }).code
}

const f = src => transform(src).code

test('arrow expression', t => {
  const src = 'const f = (a, b) => a + 1'

  const opts = {}

  const expected = `
    const f = (a, b) => {
      console.log("enter HOGE: unknown:1:11", {params: {a, b}})
      const _temp = a + 1
      console.log("exit  HOGE: unknown:1:26", {result: _temp})
      return _temp
    }
    `

  const code = injection(src, opts)
  t.true(f(expected) === code)
})

test('without babel', t => {
  const src = 'const f = (a, b) => a + 1'

  const opts = {}

  const expected = `
    const f = (a, b) => {
      console.log("enter HOGE: unknown:1:11", {params: {a, b}})
      const _temp = a + 1
      console.log("exit  HOGE: unknown:1:26", {result: _temp})
      return _temp
    }
    `

  const nodePath = getNodePath('hoge.js', src)
  const injector = new Injector()
  traverse(nodePath.node, {
    Function: (nodePath) => {
      injector.injectionToFunction(nodePath, 'HOGE')
    }
  })
  const code = generate(nodePath.node).code
  t.true(f(expected) === code)
})

test('opts', t => {
  const src = 'const f = a => a + 1'

  const opts = {
    enter: 'debug(NAME, FILENAME, START_LINE, START_COLUMN, END_LINE, END_COLUMN)',
    exit: 'debug()'
  }

  const expected = `
    const f = a => {
      debug("HOGE", "unknown", 1, 11, 1, 21)
      const _temp = a + 1
      debug()
      return _temp
    }
    `

  const code = injection(src, opts)
  t.true(f(expected) === code)
})

test('', t => {
  const src = 'const f = a => {a + 1}'

  const opts = {
    enter: 'enter(PARAMS)',
    exit: 'exit(RESULT)'
  }

  const expected = `
    const f = a => {
      enter({a})
      a + 1
      exit(null)
    }
    `

  const code = injection(src, opts)
  t.true(f(expected) === code)
})

test('', t => {
  const src = `
    const f = a => {
        return a + 1
    }
    `

  const opts = {
    enter: 'enter()',
    exit: 'exit()'
  }

  const expected = `
    const f = a => {
      enter()
      const _temp = a + 1
      exit()
      return _temp
    }
    `

  const code = injection(src, opts)
  t.true(f(expected) === code)
})

test('', t => {
  const src = `
    const f = a => {
      if (a < 0) {
        return a - 1
      } else {
        return a + 1
      }
    }
    `

  const opts = {
    enter: 'enter()',
    exit: 'exit()'
  }

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

  const code = injection(src, opts)
  t.true(f(expected) === code)
})

test('', t => {
  const src = `
    const f = a => {
      const b = () => 1
      return a + b()
    }`

  const opts = {
    enter: 'enter(START_LINE)',
    exit: 'exit(END_LINE)'
  }

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

  const code = injection(src, opts)
  t.true(f(expected) === code)
})

test('rest param', t => {
  const src = 'const f = (a, ...b) => a + 1'

  const opts = {}

  const expected = `
    const f = (a, ...b) => {
      console.log("enter HOGE: unknown:1:11", {params: {a, b}})
      const _temp = a + 1
      console.log("exit  HOGE: unknown:1:29", {result: _temp})
      return _temp
    }
    `

  const code = injection(src, opts)
  t.true(f(expected) === code)
})
