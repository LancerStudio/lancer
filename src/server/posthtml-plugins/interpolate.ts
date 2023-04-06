import fs from 'fs'
import vm from 'vm'
import path from 'path'
import fclone from 'fclone'
import renderTree from 'posthtml-render'
import { Node, NodeTag, parseIHTML, POSTHTML_OPTIONS } from '../lib/posthtml.js'
import { evalExpression } from '../lib/ssr.js'
import { SiteConfig } from '../config.js'
import { JS_FILE_RE, renderUniversalJs } from './include.js'

type WalkOptions = {
  ctx: vm.Context
  site: SiteConfig
  includeRoot: string
}
export async function resolveInterpolations(options: WalkOptions, nodes: Node[]) {
  // The context in which expressions are evaluated.
  const {ctx} = options

  let ifElseChain: 'none' | 'resolved' | 'unresolved' = 'none'

  // Iterate through all nodes in tree.
  const m = [] as Node[]

  for (let node of nodes.slice()) {
    if (typeof node === 'string') {
      const isWhitespace = !node.trim()
      if (ifElseChain === 'none' || !isWhitespace) {
        m.push(node)
      }
      if (!isWhitespace) {
        ifElseChain = 'none'
      }
      continue
    }

    if (node.render) {
      // Clone node to allow loops to interpolate a tree multiple times
      node = (node as any).clone() as NodeTag
      node.render!(code => vm.runInContext(code, ctx))
    }

    const content = node.content

    const isLoop     = node.tag === 'for'
    const isCond     = node.tag === 'if' || node.tag === 'else-if' || node.tag === 'else'
    const isScope    = node.tag === 'scope'
    const isScript   = node.tag === 'script' && !!node.attrs?.server
    const isInclude  = node.tag === 'include'
    const isTemplate = node.tag === 'template' && !!node.attrs?.type && node.attrs?.type !== true

    if (!isCond) {
      ifElseChain = 'none'
    }

    if (isScript) {
      content && vm.runInNewContext(content.join(''), { locals: ctx.locals })
      continue
    }
    else if (isLoop) {
      if (!content) continue

      const code = node.attrs?.let
      if (!code || code === true) {
        throw new Error(`[Lancer] <${node.tag}> tag must have a let="..." attribute`)
      }
      const loopCtx = vm.createContext(cloneContext(ctx))
      const loopContent: Node[] = []
      loopCtx.__recurse = async () => {
        loopContent.push(
          ...(await resolveInterpolations({ ...options, ctx: loopCtx }, content))
        )
      }
      const loopDone = new Promise((resolve, reject) => {
        loopCtx.__done = resolve
        loopCtx.__err = reject
      })
      vm.runInContext(
        `async function __go() { for (${code}) await __recurse() }; __go().then(__done,__err)`,
        loopCtx,
        { microtaskMode: 'afterEvaluate' }
      )
      await loopDone
      m.push({ tag: false, content: loopContent })
      continue
    }
    else if (isCond) {
      if (node.tag === 'else') {
        if (ifElseChain === 'none') {
          throw new Error(`[Lancer] Dangling <else> tag`)
        }
        else if (ifElseChain === 'unresolved') {
          content && m.push(await newContent(options, content))
        }
        ifElseChain = 'none'
        continue
      }
      else if (node.tag === 'else-if') {
        if (ifElseChain === 'none') {
          throw new Error(`[Lancer] Dangling <else-if> tag`)
        }
        else if (ifElseChain === 'resolved') {
          continue
        }
      }

      const cond = node.attrs?.cond
      if (!cond || cond === true) {
        throw new Error(`[Lancer] <${node.tag}> tag must have a cond="..." attribute`)
      }
      const result = evalExpression(ctx, cond)
      if (result) {
        content && m.push(await newContent(options, content))
        ifElseChain = 'resolved'
      }
      else {
        ifElseChain = 'unresolved'
      }
      continue
    }
    else if (isScope) {
      if (!content) continue

      const scopeLocalsCode = node.attrs?.locals
      if (!scopeLocalsCode || scopeLocalsCode === true) {
        throw new Error(`[Lancer] <${node.tag}> tag must have an locals="..." attribute`)
      }
      const scopeCtx = vm.createContext((() => {
        const temp = { ...ctx, ...evalExpression(ctx, scopeLocalsCode) }
        temp.locals = temp
        return temp
      })())
      const scopeContent = await resolveInterpolations({ ...options, ctx: scopeCtx }, content)
      m.push({ tag: false, content: scopeContent })
      continue
    }
    else if (isInclude) {
      const attrs = node.attrs || {}
      const root = options.includeRoot

      let src = attrs.src
      if (!src || src === true) {
        throw new Error(`[Lancer] <${node.tag}> tag must have a src="..." attribute`)
      }
      src = path.resolve(root, src)

      if (src.match(JS_FILE_RE)) {
        m.push({
          tag: false,
          content: await renderUniversalJs(src, attrs, ctx)
        })
      }
      else {
        const source = fs.readFileSync(src, 'utf-8')
        const subtree = parseIHTML(source, {
          customVoidElements: POSTHTML_OPTIONS.customVoidElements,
        }) as any

        if (attrs.locals) {
          m.push(await newContent(options, [{
            tag: 'scope',
            attrs: { locals: attrs.locals },
            content: subtree
          }]))
        }
        else {
          m.push(await newContent(options, subtree))
        }
      }
    }
    else if (isTemplate) {
      const attrs = node.attrs!
      const type = attrs.type as string

      const render = options.site.templateTypes[type]
      if (!render) {
        throw new Error(`[Lancer] No such template type: '${type}'`)
      }
      const opts = { recurse: true }
      const sourceContent = await resolveInterpolations({ ...options, ctx: vm.createContext(cloneContext(ctx)) }, node.content || [])
      const html = await render(
        renderTree(sourceContent as any /* Types should be compatible */),
        attrs,
        opts,
      )
      if (opts.recurse) {
        const subtree = parseIHTML(html, {
          customVoidElements: POSTHTML_OPTIONS.customVoidElements,
        }) as any
        const content = await resolveInterpolations({ ...options, ctx: vm.createContext(cloneContext(ctx)) }, subtree)
        m.push({ tag: false, content })
      }
      else {
        m.push({ tag: false, content: [html] })
      }
    }
    else if (content) {
      // Copy node to allow loops to interpolate a tree multiple times
      const newNode = { ...node }
      newNode.content = await resolveInterpolations(options, content)
      m.push(newNode)
      continue
    }
    else {
      m.push(node)
      continue
    }
  }

  return m
}

async function newContent(options: WalkOptions, content: Node[] | undefined) {
  return { tag: false, content: content && await resolveInterpolations(options, content) }
}

function cloneContext(ctx: vm.Context) {
    const page = ctx.page
    const newCtx = fclone(ctx)

    // Fix URL and circular reference
    // TODO: Use structuredClone
    newCtx.page = page
    newCtx.locals = newCtx

    return newCtx
}
