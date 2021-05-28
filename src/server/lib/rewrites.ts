import glob from 'glob'
import path from 'path'

const VALID_PARAM_NAME_RE = /^[a-z_][a-z0-9_]*$/i

export const FILENAME_REWRITE_RE = /\[([^\]]+)\](?:\.html)?/g

export function scanForRewriteFiles(dir: string) {
  let result = {} as Record<string, string>
  glob.sync(`${dir}/**/*.html`).forEach(to => {
    let hasParam = false
    let from = to.replace(dir, '').replace(/\[([^\]]+)\](?:\.html)?/g, (_,p1) => {
      if (!VALID_PARAM_NAME_RE.test(p1)) {
        throw new Error(`[Lancer] Invalid param file name: '${path.basename(to)}'\n  Valid param name format: ${VALID_PARAM_NAME_RE}`)
      }
      hasParam = true
      return `:${p1}`
    })
    if (hasParam) {
      result[from] = to
    }
  })
  return result
}
