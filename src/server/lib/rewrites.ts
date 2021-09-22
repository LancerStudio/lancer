import fs from 'fs'
import glob from 'glob'
import path from 'path'

const VALID_PARAM_NAME_RE = /^[a-z_][a-z0-9_]*$/i

export const FILENAME_REWRITE_RE = /\[([^\]]+)\](?:\.html)?/g

export function scanForRewriteFiles(clientDir: string) {
  let result = {} as Record<string, string>
  glob.sync(`${clientDir}/**/*.html`).forEach(to => {
    let hasParam = false
    let from = to.replace(clientDir, '').replace(/\[([^\]]+)\](?:\.html)?/g, (_,p1) => {
      if (!VALID_PARAM_NAME_RE.test(p1)) {
        throw new Error(`[Lancer] Invalid param file name: '${path.basename(to)}'\n  Valid param name format: ${VALID_PARAM_NAME_RE}`)
      }
      hasParam = true
      return `:${p1}`
    })
    if (hasParam) {
      result[from] = `file:${to}`
    }
  })
  return result
}

export function resolveRewriteDest(sourceDir: string, dest: string) {
  const i = dest.indexOf(':')
  const [prefix, destFile] = [dest.slice(0, i), dest.slice(i+1)]

  if (i === -1) {
    return dest
  }
  else if (prefix === 'file') {
    const file = path.resolve(sourceDir, destFile)
    if (!fs.existsSync(file)) {
      throw new Error(`[Lancer] No such file to rewrite to: ${dest}`)
    }
    return `${prefix}:${file}`
  }
  else {
    throw new Error(`[Lancer] No such rewrite prefix: '${prefix}'`)
  }
}
