import path from 'path'
import { existsSync, mkdirSync } from 'fs'

import { read, Env } from './lib/config'
import { requireLatest } from './lib/fs'
import { UserRow } from './models/user'

export const env = Env(['test', 'development', 'production'])

const building = !!(process.env.LANCER_BUILD || process.env.LANCER_LIBRARY_BUILD)

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
  /** The html file being rendered */
  filename: string
}

export type SiteConfig = {
  name: string
  locals: object
  locales: string[]
  cacheCssInDev: boolean
  imagePreviews: Record<string, POJO<any>> | ((sharp: typeof import('sharp')) => Record<string, POJO<any>>)
  templateTypes: Record<string, (html: string) => string | Promise<string>>
}
export const siteConfig: () => SiteConfig = () => {
  const defaults: SiteConfig = {
    name: 'Missing site.config.js',
    locals: {},
    locales: ['en'],
    cacheCssInDev: true,
    imagePreviews: {},
    templateTypes: {},
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
  if (!existsSync(dir) && !building) {
    mkdirSync(dir)
  }
  return dir
}

function handleRelative(path: string) {
  return path[0] !== '/' ? joinp(sourceDir, path) : path
}
