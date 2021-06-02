import path from 'path'
import { existsSync, mkdirSync } from 'fs'

import { read, Env } from './lib/config.js'
import { makeDirname, requireLatest } from './lib/fs.js'
import { Request } from 'express'
import { scanForRewriteFiles } from './lib/rewrites.js'

const __dirname = makeDirname(import.meta.url)

export const env = Env(['test', 'development', 'production'])

export const building = !!(process.env.LANCER_BUILD || process.env.LANCER_LIBRARY_BUILD)

export const sessionSecret = building ? '' : env.branch(() => 'TEMP KEY', {
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
  if (building) {
    // Nothing to do. During `lancer build` we assume we only have access to the build folder.
  }
  else if (process.env.LANCER_INIT_DATA_DIR || env.production) {
    mkdirSync(dataDir, { recursive: true })
  }
  else {
    throw new Error(`Data directory does not exist: '${dataDir}'\n  Run \`lancer init data\` to create.`)
  }
}

export const contentDir = read('LANCER_CONTENT_DIR', joinp(sourceDir, '/content', false))

export const cacheDir = handleRelative( read('LANCER_CACHE_DIR', joinp(dataDir, '/cache')) )
export const buildDir = handleRelative( read('LANCER_BUILD_DIR', joinp(cacheDir, '/build')) )

export const ssrDir = handleRelative( read('LANCER_SSR_CACHE_DIR', joinp(cacheDir, '/ssr')) )
export const filesDir = joinp(contentDir, '/files', false)
export const clientDir = joinp(sourceDir, '/client')
export const staticDir = handleRelative( read('LANCER_STATIC_DIR', joinp(sourceDir, '/public')) )
export const hydrateDir = handleRelative( read('LANCER_HYDRATE_DIR', joinp(cacheDir, '/hydrate')) )
export const previewsDir = joinp(cacheDir, '/previews')

export type PostHtmlCtx = {
  /** Not present when building static */
  req?: Request,
  /** Information about the page location */
  location: URL
  /** Config from the site's site.config.js file */
  site: SiteConfig
  /** Simple object for caching within the request. */
  cache: Record<string, any>
  /** The locale calculated from the request */
  locale: string
  /** The value of the relevant req.path, EXCLUDING locale */
  plainPath: string
  /** The html file being rendered */
  filename: string
  /** TODO */
  user?: unknown
}

export type SiteConfig = {
  name: string
  origin?: string
  locals: object
  studio: boolean
  locales: string[]
  cacheCssInDev: boolean
  imagePreviews: Record<string, POJO<any>> | ((sharp: typeof import('sharp')) => Record<string, POJO<any>>)
  templateTypes: Record<string, (html: string) => string | Promise<string>>
  jsxFactory?: string
  jsxFragment?: string
  rewrites: Record<string,string>
  rewriteOptions: {
    removeTrailingSlashes?: boolean
  }
}

type GetConfigOptions = {
  scanRewrites?: boolean
}
export const siteConfig = _cacheInProd((opts: GetConfigOptions={}) => {
  const defaults: SiteConfig = {
    name: 'Missing site.config.js',
    locals: {},
    studio: false,
    locales: ['en'],
    cacheCssInDev: true,
    imagePreviews: {},
    templateTypes: {},
    rewrites: {},
    rewriteOptions: {},
  }
  const config: SiteConfig = {
    ...defaults,
    ...requireLatest(`${sourceDir}/site.config.js`).module
  }

  if (!config.locales || !Array.isArray(config.locales) || !config.locales.length) {
    throw new Error(`site.config.js must specify at least one locale.`)
  }

  if (opts.scanRewrites || env.production) {
    config.rewrites = { ...config.rewrites, ...scanForRewriteFiles(clientDir) }
  }

  return config
})

function joinp(dir1: string, dir2: string, ensureExists=true) {
  const dir = path.join(dir1, dir2)
  if (!existsSync(dir) && !building && ensureExists) {
    mkdirSync(dir)
  }
  return dir
}

function handleRelative(path: string) {
  return path[0] !== '/' ? joinp(sourceDir, path) : path
}

export function _cacheInProd<F extends () => any>(f: F): F {
  if (!env.production) return f
  let cache: any = undefined
  let called = false
  return (() => {
    if (!called) {
      cache = f()
      called = true
    }
    return cache
  }) as any
}
