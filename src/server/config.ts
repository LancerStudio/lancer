import { existsSync, mkdirSync } from 'fs'
import path from 'path'
import { read, Env } from '../lib/config'

export const env = Env(['test', 'development', 'production'])

export const sourceDir = env.branch(() => read('LANCER_SOURCE_DIR', process.cwd()), {
  test: path.join(__dirname, '../test-app')
})

if (!existsSync(sourceDir)) {
  throw new Error(`Source directory does not exist: '${sourceDir}'`)
}

export const dataDir = read('LANCER_DATA_DIR', joinp(sourceDir, '/data'))
export const cacheDir = read('LANCER_CACHE_DIR', joinp(dataDir, '/cache'))
export const filesDir = joinp(dataDir, '/files')
export const clientDir = joinp(sourceDir, '/client')
export const staticDir = read('LANCER_STATIC_DIR', joinp(clientDir, '/public'))
export const previewsDir = joinp(cacheDir, '/previews')

export type PostHtmlCtx = {
  locale?: string
}

export type SiteConfig = {
  name: string
  locales: string[]
  imagePreviews?: Record<string, object> | ((sharp: typeof import('sharp')) => Record<string, object>)
}
export const site: SiteConfig = (() => {
  try { return require(`${sourceDir}/site.config.js`) }
  catch (e) { return {} }
})()

function joinp(dir1: string, dir2: string) {
  const dir = path.join(dir1, dir2)
  if (!existsSync(dir)) {
    mkdirSync(dir)
  }
  return dir
}
