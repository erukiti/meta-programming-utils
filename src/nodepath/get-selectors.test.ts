import test from 'ava'

import { parse } from 'babylon'
import { _parseSelector, getSelectors } from './get-selectors'
import { Node, NodePath } from './types'

test('', t => {
  const res = _parseSelector('hoge')
  t.deepEqual(res, { name: 'hoge', equal: undefined, types: [] })
})

test('', t => {
  const res = _parseSelector('hoge:Hoge:Fuga')
  t.deepEqual(res, { name: 'hoge', equal: undefined, types: ['Hoge', 'Fuga'] })
})

test('', t => {
  const res = _parseSelector('hoge:Hoge:Fuga=foo')
  t.deepEqual(res, { name: 'hoge', equal: 'foo', types: ['Hoge', 'Fuga'] })
})

const testNode = parse(
  `
const hoge = (a: string) => {}

`,
  { plugins: ['flow'] }
).program

test('', t => {
  const res = getSelectors(testNode, '')
  t.deepEqual(res, [])
})

test('', t => {
  const res = getSelectors(testNode, 'body')
  t.deepEqual(res, ['body'])
})

test('', t => {
  const res = getSelectors(testNode, 'body.*')
  t.deepEqual(res, ['body.0'])
})

test('', t => {
  const res = getSelectors(testNode, 'body.*:VariableDeclaration')
  t.deepEqual(res, ['body.0'])
})

test('', t => {
  const res = getSelectors(testNode, 'body.*:Wrong')
  t.deepEqual(res, [])
})

test('', t => {
  const res = getSelectors(
    testNode,
    'body.*:VariableDeclaration.declarations.*:VariableDeclarator.init:ArrowFunctionExpression'
  )
  t.deepEqual(res, ['body.0.declarations.0.init'])
})

const testNode2 = parse(
  `
import { ActionType } from '../actions'
import { AppMode } from '../types'
export type AppState = {
  mode: string
}
const initialState: AppState = {
  mode: null
}

const changeMode = (_state: AppState, mode: string): AppState => {
  return {
    ..._state,
    mode
  }
}

export default function AppReducer(state: AppState = initialState, action: ActionType): AppState {
  switch (action.type) {
    default:
      return state
  }
}

`,
  { sourceType: 'module', plugins: ['flow', 'objectRestSpread'] }
).program

test('', t => {
  // const res = getSelectors(testNode2, 'body.*:VariableDeclaration')
  // console.log(testNode2)
  const res = getSelectors(testNode2, 'body.*:VariableDeclaration.declarations.*:VariableDeclarator')
  t.deepEqual(res, ['body.3.declarations.0', 'body.4.declarations.0'])
})
