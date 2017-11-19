export const isNodeLike = obj => typeof obj === 'object' && typeof obj.type === 'string'

export interface Node {
  type: string
  [props: string]: any
}

export interface NodePath {
  type: string
  node: Node
  get: (string) => NodePath & NodePath[]

  [props: string]: any | ((any) => any)
}

// export type NodePathHolder = NodePath | Array<NodePath>
