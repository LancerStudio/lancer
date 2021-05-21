import fs from 'fs'
import path from 'path'
import { CollectionSchema, contentDir, filesDir, siteConfig } from '../config.js'
import { JsonNode, JsonNodeTag, nodesToJson, parseIHTML } from './posthtml.js'

export class Collection {
  items: any[] = []
  schema: CollectionSchema
  constructor(public name: string) {
    const schema = siteConfig().collections[name]
    if (!schema) {
      throw new Error(`[Lancer] No such collection: '${name}'`)
    }
    this.schema = schema

    const file = path.join(contentDir, 'collections', `${name}.html`)
    if (fs.existsSync(file)) {
      this.items = parseItems(this.schema, nodesToJson(parseIHTML(fs.readFileSync(file, 'utf8'))))
      console.log("Got it", this.items)
    }
    // fs.mkdirSync(path.dirname(file), { recursive: true })
  }

  [Symbol.iterator]() {
    let i = 0
    return {
      next: () => {
        if (i < this.items.length) {
          return { value: this.items[i++], done: false };
        }
        return { value: undefined, done: true };
      }
    }
  }
}

function parseItems(schema: CollectionSchema, items: JsonNode[]) {
  return items
    .map(item => {
      if (typeof item === 'string' || item.tag !== 'item') return

      const {children, attrs} = item
      return {
        attrs,
        ...children.filter((child: any) => child.tag === 'field').reduce((fields, child) => {
          if (typeof child === 'string') return fields
          const name = child.attrs.name
          if (typeof name === 'string') {
            const val = child.children.join('')
            if (schema.fields[name] === 'file') {
              const file = path.join(filesDir, val.replace('/files/', ''))
              fields[name] = {
                file,
                href: val,
                exists: fs.existsSync(file)
              }
            }
            else {
              fields[name] = val
            }
          }
          return fields
        }, {} as Record<string, any>)
      }
    })
}

function isTag(node: JsonNode): node is JsonNodeTag {
  return typeof node !== 'string'
}
