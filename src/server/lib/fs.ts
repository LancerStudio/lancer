import { statSync } from "fs"

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
	return require(require.resolve(module, { paths: [sourceDir] }))
}

export function isExternal(src: string) {
  return /^.+:\/\//.test(src)
}

export function isRelative(src: string) {
	return !isExternal(src) && !src.startsWith('/')
}
