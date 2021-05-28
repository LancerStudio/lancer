import fs from 'fs'
import path from 'path'
import { contentDir, filesDir, PostHtmlCtx } from '../config.js'
import { JsonNode, nodesToJson, parseIHTML } from './posthtml.js'

import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const endent = (require('endent') as typeof import('endent')).default

export class Collection {
  items: any[] = []
  constructor(private ctx: PostHtmlCtx, public name: string) {
    const file = path.join(contentDir, 'collections', `${name}.html`)
    if (fs.existsSync(file)) {
      this.items = parseItems(this.ctx, nodesToJson(parseIHTML(fs.readFileSync(file, 'utf8'))))
    }
    else {
      throw new Error(`[Lancer] No such collection: ${file}`)
    }
  }
}

function parseItems(ctx: PostHtmlCtx, items: JsonNode[]) {
  return items
    .map(item => {
      if (typeof item === 'string' || item.tag !== 'item') return

      const {children, attrs} = item
      return {
        ...attrs,
        fields: (children as any[]).filter(child => child.tag === 'field').reduce((fields, child) => {
          if (typeof child === 'string') return fields
          const name = child.attrs.name
          if (typeof name === 'string') {
            const value = endent(child.children.join(''))
            if (value.startsWith('/files/')) {
              const file = path.join(filesDir, value.replace('/files/', ''))
              fields[name] = {
                ...child.attrs,
                file,
                value,
                exists: fs.existsSync(file),
                location: new URL(`${ctx.location.protocol}//${ctx.location.host}${value}`),
                toString() {
                  return this.value
                }
              }
            }
            else {
              fields[name] = {
                ...child.attrs,
                value,
                toString() {
                  return this.value
                }
              }
            }
          }
          return fields
        }, {} as Record<string, any>)
      }
    })
}
