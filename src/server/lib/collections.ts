import fs from 'fs'
import path from 'path'
import { contentDir, filesDir } from '../config.js'
import { JsonNode, nodesToJson, parseIHTML } from './posthtml.js'

import { createRequire } from 'module'
import { mapValues, notNullish } from './util.js'
const require = createRequire(import.meta.url)
const endent = (require('endent') as typeof import('endent')).default

type CollectionItem = {
  attrs: Record<string, any>
  fields: Record<string, CollectionItemField>
}
type CollectionItemField =
  | { type: 'basic', attrs: Record<string, any>, value: any }
  | { type: 'file', attrs: Record<string, any>, value: any, file: string, exists: number, location: Location }


type Options = {
  host: string
  protocol: string
}
export function loadCollectionItems(name: string, opts: Options) {
  const file = path.join(contentDir, 'collections', `${name}.html`)
  if (fs.existsSync(file)) {
    return parseItems(nodesToJson(parseIHTML(fs.readFileSync(file, 'utf8'))), opts)
  }
  else {
    throw new Error(`[Lancer] No such collection: ${file}`)
  }
}

export function simplifyCollectionItem(item: CollectionItem) {
  return {
    ...mapValues(item.fields, field => field.value),
    ...item.attrs,
  }
}

function parseItems(items: JsonNode[], opts: Options): CollectionItem[] {
  return items
    .map(item => {
      if (typeof item === 'string' || item.tag !== 'item') return

      const {children, attrs} = item
      return {
        attrs,
        fields: (children as any[]).filter(child => child.tag === 'field').reduce((fields, child) => {
          if (typeof child === 'string') return fields
          const name = child.attrs.name
          if (typeof name === 'string') {
            const value = endent(child.children.join(''))
            if (value.startsWith('/files/')) {
              const file = path.join(filesDir, value.replace('/files/', ''))
              fields[name] = {
                type: 'file' as const,
                attrs: child.attrs,
                file,
                value,
                exists: fs.existsSync(file),
                location: new URL(`${opts.protocol}//${opts.host}${value}`),
              }
            }
            else {
              fields[name] = {
                type: 'basic' as const,
                attrs: child.attrs,
                value,
              }
            }
          }
          return fields
        }, {} as Record<string, CollectionItemField>)
      }
    })
    .filter(notNullish)
}
