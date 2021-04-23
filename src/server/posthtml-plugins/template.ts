import parser from '@lancer/posthtml-parser'
import { siteConfig } from '../config'
const {match} = require('posthtml/lib/api')

export default function TemplatePlugin () {

  return async function posthtmlTemplate(tree: any) {
    tree.parser = tree.parser || parser
    tree.match = tree.match || match

    const tasks: Promise<any>[] = []

    tree.match({tag: 'template'}, (node: any) => {
      const attrs = node.attrs || {}

      const type = attrs.type
      if (!type) return node

      const render = siteConfig().templateTypes[type]
      if (!render) {
        throw new Error(`[Lancer] No such template type: '${type}'`)
      }

      const newNode = {
        tag: attrs.tag || 'div',
        attrs,
        content: null as any,
      }

      delete newNode.attrs.type
      delete newNode.attrs.tag

      tasks.push(async function() {
        newNode.content = await render(node.content.join(''))
      }())

      return newNode
    })

    await Promise.all(tasks)

    return tree
  }
}
