import path from 'path'
import { read, Env } from '../lib/config'

export const env = Env(['test', 'development', 'production'])

export const sourceDir = env.branch(() => read('LANCER_SOURCE_DIR', process.cwd()), {
  test: path.join(__dirname, '../test-app')
})

export const dataDir = read('LANCER_DATA_DIR', path.join(sourceDir, '/data'))
export const filesDir = path.join(dataDir, '/files')
export const clientDir = path.join(sourceDir, '/client')
export const staticDir = read('LANCER_STATIC_DIR', path.join(clientDir, '/public'))

export type PostHtmlCtx = {
  locale?: string
}

export type SiteConfig = {
  name: string
  locales: string[]
}
export const site: SiteConfig = (() => {
  try { return require(`${sourceDir}/site.config.js`) }
  catch (e) { return {} }
})()
