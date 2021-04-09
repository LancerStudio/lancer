import parser from '@lancer/posthtml-parser'
import fs from 'fs'
import path from 'path'
import { POSTHTML_OPTIONS } from '../lib/posthtml'
const {match} = require('posthtml/lib/api')

type Options = {
  root?: string
  encoding?: string
}
export default (options: Options = {}) => {
  const root = options.root || './'
  const encoding = options.encoding || 'utf-8'

  return function posthtmlInclude(tree: any) {
    tree.parser = tree.parser || parser
    tree.match = tree.match || match

    tree.match({tag: 'include'}, (node: any) => {
      let src = node.attrs.src || false
      let content
      let subtree
      let source

      if (src) {
        src = path.resolve(root, src)
        source = fs.readFileSync(src, encoding as BufferEncoding)

        subtree = (tree.parser as typeof parser)(source, {
          customVoidElements: POSTHTML_OPTIONS.customVoidElements,
        }) as any
        subtree.match = tree.match
        subtree.parser = tree.parser
        content = source.includes('include') ? posthtmlInclude(subtree) : subtree

        if (tree.messages) {
          tree.messages.push({
            type: 'dependency',
            file: src
          })
        }
      }

      return {
        tag: false,
        content
      }
    })

    return tree
  }
}
