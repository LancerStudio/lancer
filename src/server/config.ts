import path from 'path'
import { read, Env } from '../lib/config'

const env = Env(['test', 'development', 'production'])

export const sourceDir = env.branch(() => read('FREELANCE_SOURCE_DIR', process.cwd()), {
  test: path.join(__dirname, '../test-app')
})

export const clientDir = path.join(sourceDir, '/client')
export const staticDir = read('FREELANCE_STATIC_DIR', (clientDir + '/public'))

export const site = (() => {
  try { return require(`${sourceDir}/site.config.js`) }
  catch (e) { return {} }
})()
