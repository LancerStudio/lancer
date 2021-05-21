import vm from 'vm'
import parser from '@lancer/ihtml-parser'
import renderTree from 'posthtml-render'
import { siteConfig } from '../config.js'
import { resolveInterpolations } from './interpolate.js'
import { match } from 'posthtml/lib/api.js'

type Options = {
  locals: object
}
export default function TemplatePlugin ({ locals }: Options) {

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
        newNode.content = await render(renderTree(resolveInterpolations({ ctx: vm.createContext(locals) }, node.content) as any))
        if (typeof newNode.content === 'string') {
          newNode.content = [newNode.content]
        }
      }().catch(err => {
        console.error(`[Lancer] Render template type="${type}" failed\n  `, err)
      }))

      return newNode
    })

    await Promise.allSettled(tasks)

    return tree
  }
}
