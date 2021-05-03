import vm from 'vm'
import fclone from 'fclone'
import { Node, NodeTag } from '../lib/posthtml'

type Options = {
  locals: object
}
export function InterpolatePlugin({ locals }: Options) {
  return function interpolatePlugin(tree: any) {
    return resolveInterpolations({ ctx: vm.createContext(locals) }, tree)
  }
}

type WalkOptions = {
  ctx: vm.Context
}
export function resolveInterpolations(options: WalkOptions, nodes: Node[]) {
  const {ctx} = options
  // The context in which expressions are evaluated
  // Iterate through all nodes in tree
  return nodes.slice().reduce((m, node) => {
    if (typeof node === 'string') {
      m.push(node)
      return m
    }

    if (node.render) {
      // Clone node to allow loops to interpolate a tree multiple times
      node = (node as any).clone() as NodeTag
      node.render!(code => vm.runInContext(code, ctx))
    }

    const content = node.content
    const isLoop = node.tag === 'for' && typeof node.attrs?.let === 'string'

    if (content && !isLoop) {
      // Copy node to allow loops to interpolate a tree multiple times
      const newNode = { ...node }
      newNode.content = resolveInterpolations(options, content)
      m.push(newNode)
      return m
    }
    else if (content && isLoop) {
      const loopCtx = vm.createContext(fclone(ctx))
      const loopContent: Node[] = []
      loopCtx.__recurse = () => {
        loopContent.push(
          ...resolveInterpolations({ ctx: loopCtx }, content)
        )
      }
      vm.runInContext(`for (var ${node.attrs!.let}) __recurse()`, loopCtx, { microtaskMode: 'afterEvaluate' })
      m.push({
        tag: false,
        content: loopContent,
      })
      return m
    }
    else {
      m.push(node)
      return m
    }
  }, [] as Node[])
}
