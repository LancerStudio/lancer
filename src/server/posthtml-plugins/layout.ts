//
// Taken and modified from https://github.com/posthtml/posthtml-extend
//
import fs from 'fs'
import path from 'path'
import { parseIHTML } from '../lib/posthtml'
import { clientDir } from '../config'
import { POSTHTML_OPTIONS } from '../lib/posthtml'
import { interpolate } from '../lib/ssr'

const Api = require('posthtml/lib/api')
const matchHelper = require('posthtml-match-helper')

type NestedLayoutContext = {
  childPageAttrs: object
  onPageAttrs: Options['onPageAttrs']
}

type Options = {
  locals: object
  onPageAttrs(attrs: Record<string,string>): void
}
export default function LayoutPlugin({ locals, onPageAttrs }: Options) {
  return function layoutPlugin(this: undefined | NestedLayoutContext, tree: any) {
    let pageAttrs: any = null
    tree.match(matchHelper('page'), function(node: any) {
      pageAttrs = node.attrs || {}

      return { tag: false }
    })

    if (!pageAttrs || pageAttrs.layout === 'false') return

    for (let attr in pageAttrs) {
      pageAttrs[attr] = interpolate({ ...locals, page: this?.childPageAttrs || {} }, pageAttrs[attr])
    }

    if (this) pageAttrs = { ...this.childPageAttrs, ...pageAttrs }

    const layoutName = ['', undefined, true].includes(pageAttrs.layout) ? '_layout.html' : pageAttrs.layout
    const layoutFile = path.join(clientDir, layoutName)
    if (!layoutFile || !fs.existsSync(layoutFile)) {
      throw new Error(`No such layout file: '${layoutName}'`)
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
        console.warn(`No <yield> tag found for <content-for name="${attrs.name}">`)
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

    if (layoutName !== '_layout.html') {
      // This may be a nested layout. Recurse.
      const {layout, ...childPageAttrs} = pageAttrs
      layoutPlugin.call({ childPageAttrs, onPageAttrs }, tree)
    }
    else {
      onPageAttrs(pageAttrs)
    }
  }
}
