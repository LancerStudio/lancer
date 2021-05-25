//
// Taken and modified from https://github.com/posthtml/posthtml-extend
//
import fs from 'fs'
import vm from 'vm'
import path from 'path'
import colors from 'kleur'
import { parseIHTML, NodeTag } from '../lib/posthtml.js'
import { clientDir, PostHtmlCtx } from '../config.js'
import { POSTHTML_OPTIONS } from '../lib/posthtml.js'
import { evalExpression } from '../lib/ssr.js'

import Api from 'posthtml/lib/api.js'
import matchHelper from 'posthtml-match-helper'
import { isRelative } from '../lib/fs.js'

type NestedLayoutContext = {
  childPageAttrs: object
  onPageAttrs: Options['onPageAttrs']
  filename: string
}

type Options = {
  ctx: PostHtmlCtx
  locals: object
  onPageAttrs(attrs: Record<string,string>): void
}
export default function LayoutPlugin({ ctx, locals, onPageAttrs }: Options) {
  return function layoutPlugin(this: undefined | NestedLayoutContext, tree: any) {
    const currentFile = this ? this.filename : ctx.filename

    let pageAttrs: any = null
    tree.match(matchHelper('page'), (node: NodeTag) => {
      if (node.render) {
        node.render(code => evalExpression(vm.createContext({ ...locals, page: this?.childPageAttrs }), code))
      }
      pageAttrs = node.attrs || {}

      return { tag: false }
    })

    if (!pageAttrs || pageAttrs.layout === 'false') return

    if (this) pageAttrs = { ...this.childPageAttrs, ...pageAttrs }

    const layoutName = ['', undefined, true].includes(pageAttrs.layout) ? '/_layout.html' : pageAttrs.layout
    const layoutFile = isRelative(layoutName)
      ? path.join(path.dirname(currentFile), layoutName)
      : path.join(clientDir, layoutName)

    if (!layoutFile || !fs.existsSync(layoutFile)) {
      throw new Error(`No such layout file: '${layoutName}'\n  from ${currentFile}`)
    }
    if (!layoutFile.startsWith(clientDir)) {
      throw new Error(`Security: Cannot use layout file outside client/ folder: '${layoutName}'`)
    }

    const mainContent = [] as any[]
    const contentFor = {} as Record<string, any[]>

    const layout = parseIHTML(fs.readFileSync(layoutFile, 'utf8'), {
      customVoidElements: POSTHTML_OPTIONS.customVoidElements,
    })

    Api.match.call(layout, matchHelper('yield'), function(node: any) {
      const attrs = node.attrs || {}
      const content = attrs.name
        ? contentFor[attrs.name] || (contentFor[attrs.name] = [])
        : mainContent

      return { tag: false, content }
    })


    tree.match(matchHelper('content-for'), function(node: any) {
      const attrs = node.attrs || {}
      if (!attrs.name) {
        throw new Error(`<content-for> requires a name="" attribute`)
      }
      if (contentFor[attrs.name]) {
        node.content && contentFor[attrs.name]!.push(...node.content)
      }
      else {
        console.warn(colors.yellow(`WARNING: No <yield> tag found for <content-for name="${attrs.name}">`))
      }
      return { tag: false }
    })

    //
    // Directly mutate tree to wray content in layout.
    // Since tree is an array extended with extra attributes,
    // we take care not to lose them.
    //
    mainContent.push(...tree.slice())
    tree.length = 0
    tree.push(...layout)

    if (layoutName !== '/_layout.html') {
      // This may be a nested layout. Recurse.
      const {layout, ...childPageAttrs} = pageAttrs
      layoutPlugin.call({ childPageAttrs, onPageAttrs, filename: layoutFile }, tree)
    }
    else {
      onPageAttrs(pageAttrs)
    }
  }
}
