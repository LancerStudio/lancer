import path from 'path'
import { existsSync, mkdirSync } from 'fs'

import { read, Env } from './lib/config'
import { requireLatest } from './lib/fs'
import { UserRow } from './models/user'

export const env = Env(['test', 'development', 'production'])

export const sessionSecret = env.branch(() => 'TEMP KEY', {
  production: () => read('SESSION_SECRET')
})


export const sourceDir = env.branch(() => read('LANCER_SOURCE_DIR', process.cwd()), {
  test: path.join(__dirname, '../test-app')
})
if (!existsSync(sourceDir)) {
  throw new Error(`Source directory does not exist: '${sourceDir}'`)
}


export const dataDir = read('LANCER_DATA_DIR', path.join(sourceDir, '/data'))
if (!existsSync(dataDir)) {
  if (process.env.LANCER_INIT_DATA_DIR || env.production) {
    mkdirSync(dataDir, { recursive: true })
  }
  else {
    throw new Error(`Data directory does not exist: '${dataDir}'\n  Run \`lancer init data\` to create.`)
  }
}


export const cacheDir = read('LANCER_CACHE_DIR', joinp(dataDir, '/cache'))
export const buildDir = read('LANCER_BUILD_DIR', joinp(process.env.LANCER_BUILD_LOCAL ? sourceDir : cacheDir, '/build'))
export const filesDir = joinp(dataDir, '/files')
export const clientDir = joinp(sourceDir, '/client')
export const staticDir = read('LANCER_STATIC_DIR', joinp(clientDir, '/public'))
export const previewsDir = joinp(cacheDir, '/previews')

export type PostHtmlCtx = {
  /** Config from the site's site.config.js file */
  site: SiteConfig
  /** The signed in user */
  user: UserRow | null
  /** Simple object for caching within the request. */
  cache: Record<string, any>
  /** The locale calculated from the request */
  locale: string
  /** The value of the relevant req.path, EXCLUDING locale */
  reqPath: string
}

export type SiteConfig = {
  name: string
  locales: string[]
  imagePreviews: Record<string, POJO<any>> | ((sharp: typeof import('sharp')) => Record<string, POJO<any>>)
}
export const siteConfig: () => SiteConfig = () => {
  const defaults: SiteConfig = {
    name: 'Missing site.config.js',
    locales: ['en'],
    imagePreviews: {},
  }
  const config = {
    ...defaults,
    ...requireLatest(`${sourceDir}/site.config.js`).module
  }

  if (!config.locales || !Array.isArray(config.locales) || !config.locales.length) {
    throw new Error(`site.config.js must specify at least one locale.`)
  }

  return config
}

function joinp(dir1: string, dir2: string) {
  const dir = path.join(dir1, dir2)
  if (!existsSync(dir)) {
    mkdirSync(dir)
  }
  return dir
}
