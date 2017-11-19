import test from 'ava'

import {getNodePath} from './nodepath'

test('test', t => {
  const filename = 'test.js'
  const source = `console.log('hello world')`
  const nodePath = getNodePath(filename, source)
  t.true(nodePath.getSource() === source)
})