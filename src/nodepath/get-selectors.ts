import { Node, NodePath } from './types'

export const _parseSelector = (selectorFragment: string) => {
  const [s, equal] = selectorFragment.split('=')
  const [name, ...types] = s.split(':')

  return { name, types, equal }
}

const checkTypes = (types, n) => {
  const ignoreTypes = types.filter(type => type.substr(0, 1) === '!')
  const failed = ignoreTypes.filter(type => n.type === type.substr(1))
  if (failed.length > 0) {
    return false
  }

  const targetTypes = types.filter(type => type.substr(0, 1) !== '!')
  if (targetTypes.length > 0 && !targetTypes.includes(n.type)) {
    return false
  }
  return true
}
const _selector = (node: Node | Node[], selectorFragment: string) => {
  const { name, types, equal } = _parseSelector(selectorFragment)
  if (Array.isArray(node)) {
    if (name === '*') {
      return node.map((n, i) => (checkTypes(types, n) ? `${i}` : null)).filter(i => i !== null)
    } else {
      if (name in node) {
        return [name]
      } else {
        return []
      }
    }
  }

  if (!(name in node)) {
    return []
  }

  if (!checkTypes(types, node[name])) {
    return []
  }

  // FIXME: regexp

  if (equal !== undefined && node[name] !== equal) {
    return []
  }

  return [name]
}

export const getSelectors = (node: Node, selector: string, filters: string[] = []) => {
  const selectorFragments = selector.split('.')

  let nodes = _selector(node, selectorFragments[0]).map(key => ({ key, node: node[key] }))
  selectorFragments.shift()

  let selectorFragment
  while ((selectorFragment = selectorFragments.shift())) {
    const newNodes = []
    nodes.forEach(({ key, node: n }) => {
      _selector(n, selectorFragment).forEach(newKey => {
        newNodes.push({
          key: `${key}.${newKey}`,
          node: n[newKey]
        })
      })
    })
    nodes = newNodes
  }

  // if (filters.length > 0) {
  //   nodes = nodes.filter(n => {
  //     filters.forEach(filter => {
  //       const filterFragments = filter.split('.')

  //     })

  //   })

  // }

  return nodes.map(({ key }) => key)
}
