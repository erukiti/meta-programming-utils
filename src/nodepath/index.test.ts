import * as babel from '@babel/core'
import test from 'ava'

import { NodePathUtility } from './index'

test('test', t => {
  const filename = 'test.js'
  const util = new NodePathUtility({ babel, filename })

  const source = `console.log('hello world')`
  const nodePath = util.getNodePath(source)
  t.true(nodePath.getSource() === source)
})
