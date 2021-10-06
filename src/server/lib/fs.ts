import path from 'path'
import { statSync } from 'fs'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

import RL from 'n-readlines'
import { Parser } from '@lancer/ihtml-parser'

const require = createRequire(import.meta.url)

const cache = {} as Record<string, number>

export function requireLatest(module: string) {
	const file = require.resolve(module)
	const stat = statSync(file)
	let fresh = !cache[file] || cache[file] !== stat.mtimeMs
	if (fresh) {
		delete require.cache[file]
		cache[file] = stat.mtimeMs
	}
	return {
		module: require(module),
		/** True if the file was just now loaded from disk */
		fresh,
	}
}

export function requireLatestOptional(module: string) {
	try {
		return requireLatest(module)
	}
	catch(err) {
		return null
	}
}

export function requireUserland(sourceDir: string, module: string) {
	return require(requireResolveUserland(sourceDir, module))
}

export function requireResolveUserland(sourceDir: string, module: string) {
  return require.resolve(module, { paths: [sourceDir] })
}

export function isExternal(src: string) {
  return /^.+:\/\//.test(src)
}

export function isRelative(src: string) {
	return !isExternal(src) && !src.startsWith('/')
}

export function makeDirname(importMetaUrl: string) {
	return path.dirname(fileURLToPath(importMetaUrl))
}

// For some reason TS cannot find this type from ihtml-parser
type Attributes = { [name: string]: string | true }

export function getPageAttrs(file: string) {
	// Read as little of the file as possible
  const lines = new RL(file)
  let pageTag = ''
  let rawLine: Buffer
  while (rawLine = lines.next()) {
    const line = rawLine.toString('utf8')
    if (line.match(/^\w*$/)) continue
    if (!line.match(/^\w*<page\b/)) break

    pageTag = line
    while (rawLine = lines.next()) {
      pageTag += '\n' + rawLine.toString('utf8')
      if (pageTag.indexOf('>') >= 0) break
    }

    let pageAttrs: Attributes | null = {}
    const parser = new Parser({
      onopentag(name, attrs) {
        if (name === 'page') pageAttrs = attrs
      }
    })
    parser.write(pageTag)
    parser.end()

    return pageAttrs
  }
  return null
}
