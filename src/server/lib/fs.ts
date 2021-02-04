import { statSync } from "fs"

const cache = {} as Record<string, number>

export function requireLatest(module: string) {
	const file = require.resolve(module)
	const stat = statSync(file)
	if (!cache[file] || cache[file] !== stat.mtimeMs) {
		delete require.cache[file]
		cache[file] = stat.mtimeMs
	}
	return require(module)
}