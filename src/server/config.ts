import path from 'path'
import { existsSync, mkdirSync } from 'fs'

import { read, Env } from '../lib/config'
import { requireLatest } from './lib/fs'

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
  site: SiteConfig
  /** Simple object for caching within the request. */
  cache: Record<string, any>
  /** The locale calculated from the request */
  locale?: string
}

export type SiteConfig = {
  name: string
  locales: string[]
  imagePreviews: Record<string, POJO<any>> | ((sharp: typeof import('sharp')) => Record<string, POJO<any>>)
}
export const siteConfig: () => SiteConfig = () => {
  const defaults: SiteConfig = {
    name: 'Missing site.config.js',
    locales: [],
    imagePreviews: {},
  }
  try {
    const config = requireLatest(`${sourceDir}/site.config.js`).module
    return { ...defaults, ...config }
  }
  catch (e) {
    return defaults
  }
}

function joinp(dir1: string, dir2: string) {
  const dir = path.join(dir1, dir2)
  if (!existsSync(dir)) {
    mkdirSync(dir)
  }
  return dir
}
