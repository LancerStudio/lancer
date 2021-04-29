import vm from 'vm'
import { Node } from '../lib/posthtml'

type Options = {
  locals: object
}
export function InterpolatePlugin({ locals }: Options) {
  return function interpolatePlugin(tree: any) {
    return resolveInterpolations({ locals }, tree)
  }
}

type WalkOptions = {
  locals: object
}
export function resolveInterpolations(opts: WalkOptions, nodes: Node[]) {
  // The context in which expressions are evaluated
  const ctx = vm.createContext(opts.locals)

  // Iterate through all nodes in tree
  return nodes.slice().reduce((m, node) => {
    if (typeof node === 'string') {
      m.push(node)
      return m
    }

    if (node.render) {
      node.render(code => vm.runInContext(code, ctx))
    }

    // TODO: each, if-else

    if (node.content) {
      node.content = resolveInterpolations(opts, node.content)
    }

    m.push(node)
    return m
  }, [] as Node[])
}
