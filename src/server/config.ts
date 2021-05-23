import glob from 'glob'
import path from 'path'
import { existsSync, mkdirSync } from 'fs'

import { read, Env } from './lib/config.js'
import { makeDirname, requireLatest } from './lib/fs.js'
import { UserRow } from './models/user.js'
import { Request } from 'express'

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

export const cacheDir = handleRelative( read('LANCER_CACHE_DIR', joinp(dataDir, '/cache')) )
export const buildDir = handleRelative( read('LANCER_BUILD_DIR', joinp(cacheDir, '/build')) )
export const filesDir = joinp(dataDir, '/files')
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
  /** The signed in user */
  user: UserRow | null
  /** Simple object for caching within the request. */
  cache: Record<string, any>
  /** The locale calculated from the request */
  locale: string
  /** The value of the relevant req.path, EXCLUDING locale */
  plainPath: string
  /** The html file being rendered */
  filename: string
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
}

const VALID_PARAM_NAME_RE = /^[a-z_][a-z0-9_]*$/i

type GetConfigOptions = {
  refreshFileBasedRewrites?: boolean
}
export const siteConfig = (opts: GetConfigOptions={}) => {
  const defaults: SiteConfig = {
    name: 'Missing site.config.js',
    locals: {},
    studio: false,
    locales: ['en'],
    cacheCssInDev: true,
    imagePreviews: {},
    templateTypes: {},
    rewrites: {},
  }
  const config: SiteConfig = {
    ...defaults,
    ...requireLatest(`${sourceDir}/site.config.js`).module
  }

  if (!config.locales || !Array.isArray(config.locales) || !config.locales.length) {
    throw new Error(`site.config.js must specify at least one locale.`)
  }

  if (opts.refreshFileBasedRewrites) {
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
        config.rewrites[from] = to
      }
    })
  }

  return config
}

function joinp(dir1: string, dir2: string) {
  const dir = path.join(dir1, dir2)
  if (!existsSync(dir) && !building) {
    mkdirSync(dir)
  }
  return dir
}

function handleRelative(path: string) {
  return path[0] !== '/' ? joinp(sourceDir, path) : path
}
