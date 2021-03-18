//
// Taken and modified from https://github.com/posthtml/posthtml-extend
//
import fs from 'fs'
import path from 'path'
import parseToPostHtml from 'posthtml-parser'
import { clientDir } from '../config'

const Api = require('posthtml/lib/api')
const matchHelper = require('posthtml-match-helper')

type Options = {
  onPageAttrs?(attrs: Record<string,string>): void
}
export default function LayoutPlugin(opts: Options = {}) {
  return function layoutPlugin(tree: any) {
    let pageAttrs: any = null
    tree.match(matchHelper('page'), function(node: any) {
      pageAttrs = node.attrs || {}

      return { tag: false }
    })

    if (!pageAttrs || !('layout' in pageAttrs)) return

    const layoutName = pageAttrs.layout === '' ? '_layout.html' : pageAttrs.layout
    const layoutFile = path.join(clientDir, layoutName)
    if (!layoutFile || !fs.existsSync(layoutFile)) {
      throw new Error(`No such layout file: '${layoutName}'`)
    }
    if (!layoutFile.startsWith(clientDir)) {
      throw new Error(`Security: Cannot use layout file outside client/ folder: '${layoutName}'`)
    }

    const layout = parseToPostHtml(fs.readFileSync(layoutFile, 'utf8'))

    Api.match.call(layout, matchHelper('yield'), () => {
      // TODO: Support <yield name="my-stuff"> and <content-for name="my-stuff">
      return {
        tag: false,
        content: tree.slice(),
      }
    })

    //
    // Directly mutate tree to wray content in layout.
    // Since tree is an array extended with extra attributes,
    // we take care not to lose them.
    //
    tree.length = 0
    tree.push(...layout)

    opts.onPageAttrs?.(pageAttrs)
  }
}
