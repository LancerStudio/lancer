const fs = require('fs')
const path = require('path')
const parser = require('posthtml-parser')
const {match} = require('posthtml/lib/api')

type Options = {
  root?: string
  encoding?: string
}
export default (options: Options = {}) => {
  options.root = options.root || './'
  options.encoding = options.encoding || 'utf-8'

  return function posthtmlInclude(tree: any) {
    tree.parser = tree.parser || parser
    tree.match = tree.match || match

    tree.match({tag: 'include'}, (node: any) => {
      let src = node.attrs.src || false
      let content
      let subtree
      let source

      if (src) {
        src = path.resolve(options.root, src)
        source = fs.readFileSync(src, options.encoding)

        subtree = tree.parser(source)
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
