import vm from 'vm'
import fclone from 'fclone'
import { Node, NodeTag } from '../lib/posthtml.js'
import { evalExpression } from '../lib/ssr.js'

type WalkOptions = {
  ctx: vm.Context
}
export function resolveInterpolations(options: WalkOptions, nodes: Node[]) {
  // The context in which expressions are evaluated.
  const {ctx} = options

  let ifElseChain: 'none' | 'resolved' | 'unresolved' = 'none'

  // Iterate through all nodes in tree.
  return nodes.slice().reduce((m, node) => {
    if (typeof node === 'string') {
      const isWhitespace = !node.trim()
      if (ifElseChain === 'none' || !isWhitespace) {
        m.push(node)
      }
      if (!isWhitespace) {
        ifElseChain = 'none'
      }
      return m
    }

    if (node.render) {
      // Clone node to allow loops to interpolate a tree multiple times
      node = (node as any).clone() as NodeTag
      node.render!(code => vm.runInContext(code, ctx))
    }

    const content = node.content

    const isLoop   = node.tag === 'for'
    const isCond   = node.tag === 'if' || node.tag === 'else-if' || node.tag === 'else'
    const isScope  = node.tag === 'scope'
    const isScript = node.tag === 'script' && !!node.attrs?.server

    if (!isCond) {
      ifElseChain = 'none'
    }

    if (isScript) {
      content && vm.runInNewContext(content.join(''), { locals: ctx.locals })
      return m
    }
    else if (isLoop) {
      if (!content) return m

      const code = node.attrs?.let
      if (!code || code === true) {
        throw new Error(`[Lancer] <${node.tag}> tag must have a let="..." attribute`)
      }
      const loopCtx = vm.createContext(fclone(ctx))
      const loopContent: Node[] = []
      loopCtx.__recurse = () => {
        loopContent.push(
          ...resolveInterpolations({ ctx: loopCtx }, content)
        )
      }
      vm.runInContext(`for (var ${code}) __recurse()`, loopCtx, { microtaskMode: 'afterEvaluate' })
      m.push({ tag: false, content: loopContent })
      return m
    }
    else if (isCond) {
      if (node.tag === 'else') {
        if (ifElseChain === 'none') {
          throw new Error(`[Lancer] Dangling <else> tag`)
        }
        else if (ifElseChain === 'unresolved') {
          content && m.push(newContent(options, content))
        }
        ifElseChain = 'none'
        return m
      }
      else if (node.tag === 'else-if') {
        if (ifElseChain === 'none') {
          throw new Error(`[Lancer] Dangling <else-if> tag`)
        }
        else if (ifElseChain === 'resolved') {
          return m
        }
      }

      const cond = node.attrs?.cond
      if (!cond || cond === true) {
        throw new Error(`[Lancer] <${node.tag}> tag must have a cond="..." attribute`)
      }
      const result = evalExpression(ctx, cond)
      if (result) {
        content && m.push(newContent(options, content))
        ifElseChain = 'resolved'
      }
      else {
        ifElseChain = 'unresolved'
      }
      return m
    }
    else if (isScope) {
      if (!content) return m

      const scopeLocalsCode = node.attrs?.locals
      if (!scopeLocalsCode || scopeLocalsCode === true) {
        throw new Error(`[Lancer] <${node.tag}> tag must have an locals="..." attribute`)
      }
      const scopeCtx = vm.createContext((() => {
        const temp = { ...ctx, ...evalExpression(ctx, scopeLocalsCode) }
        temp.locals = temp
        return temp
      })())
      const scopeContent = resolveInterpolations({ ...options, ctx: scopeCtx }, content)
      m.push({ tag: false, content: scopeContent })
      return m
    }
    else if (content) {
      // Copy node to allow loops to interpolate a tree multiple times
      const newNode = { ...node }
      newNode.content = resolveInterpolations(options, content)
      m.push(newNode)
      return m
    }
    else {
      m.push(node)
      return m
    }
  }, [] as Node[])
}

function newContent(options: WalkOptions, content: Node[] | undefined) {
  return { tag: false, content: content && resolveInterpolations(options, content) }
}
