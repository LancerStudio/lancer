import path from 'path'
import { existsSync, mkdirSync } from 'fs'
import mapValues from 'lodash/mapValues.js'

import { read, Env } from './lib/config.js'
import { requireLatest } from './lib/fs.js'
import { Request } from 'express'
import { scanForRewriteFiles, resolveRewriteDest } from './lib/rewrites.js'
import { buildSiteConfigFile } from './bundle.js'

export const env = Env(['test', 'development', 'production'])

export const building = !!(process.env.LANCER_BUILD || process.env.LANCER_LIBRARY_BUILD)

export const sessionSecret = building ? '' : env.branch(() => 'TEMP KEY', {
  production: () => read('SESSION_SECRET')
})


export const sourceDir = read('LANCER_SOURCE_DIR', process.cwd())

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

type Attributes = { [name: string]: string | true }

export type TemplateRenderConfig = {
  /** Setting this to true will cause Lancer to parse and render the return value of your template render function. */
  recurse: boolean
}

export type SiteConfig = {
  name: string
  origin?: string
  locals: object
  /** When true, builds html/css/js as static output (no server backend) */
  static: boolean
  studio: boolean
  locales: string[]
  /** (rare) Use when hosting your website on a path other than the root of a domain. Only affects production. */
  rootPath: string
  cacheCssInDev: boolean
  imagePreviews: Record<string, POJO<any>> | ((sharp: typeof import('sharp')) => Record<string, POJO<any>>)
  templateTypes: Record<string, (html: string, attrs: Attributes, config?: TemplateRenderConfig) => string | Promise<string>>
  jsxFactory?: string
  jsxFragment?: string
  rewrites: Record<string,string>
  rewriteOptions: {
    removeTrailingSlashes?: boolean
  }
  bundleAliases: Record<string,string>
}

type GetConfigOptions = {
  scanRewrites?: boolean
}
export const siteConfig = _cache(async (opts: GetConfigOptions={}) => {
  const defaults: SiteConfig = {
    name: 'Missing site.config.js',
    locals: {},
    static: false,
    studio: false,
    locales: ['en'],
    rootPath: '/',
    cacheCssInDev: true,
    imagePreviews: {},
    templateTypes: {},
    rewrites: {},
    rewriteOptions: {},
    bundleAliases: {},
  }

  const siteConfigBuildFile = await buildSiteConfigFile(path.join(sourceDir, 'site.config.js'))

  const config: SiteConfig = {
    ...defaults,
    ...requireLatest(siteConfigBuildFile).module.default
  }

  if (!config.locales || !Array.isArray(config.locales) || !config.locales.length) {
    throw new Error(`site.config.js must specify at least one locale.`)
  }

  if (opts.scanRewrites || env.production) {
    config.rewrites = {
      ...mapValues(config.rewrites, dest => resolveRewriteDest(sourceDir, dest)),
      ...scanForRewriteFiles(clientDir),
    }
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

function handleRelative(_path: string) {
  return path.isAbsolute(_path) ? _path : joinp(sourceDir, _path);
}

// [ASSUMPTION] A dev won't try to change the config more than 400ms at a time
const CACHE_TIME = 400
let cache: any = undefined
let lastCalled = 0
export function _cache<F extends () => any>(f: F): F {
  return (() => {
    if (
      lastCalled === 0 ||
      (env.development && Date.now() - lastCalled > CACHE_TIME)
    ) {
      cache = f()
      lastCalled = Date.now()
    }
    return cache
  }) as any
}

export function unsafeGetSiteCache(): SiteConfig {
  return cache
}
