import path from 'path'
import glob from 'glob'

import * as Bundle from './bundle'
import * as i18n from './i18n'
import IncludePlugin from './posthtml-plugins/include'
import { clientDir, filesDir, PostHtmlCtx } from "./config"
import { Translation } from './models'

export const validStyleBundles: Record<string, boolean> = {}
export const validScriptBundles: Record<string, boolean> = {}


export function render(ctx: PostHtmlCtx) {
  return require('posthtml')([
    Bundle.posthtmlPlugin({
      resolveScript: function (scriptPath: string) {
        var resolved = resolveAsset(scriptPath)
        validScriptBundles[resolved] = true
        return resolved.replace(clientDir, '')
      },
      resolveStyle: function (stylePath: string) {
        var resolved = resolveAsset(stylePath)
        validStyleBundles[resolved] = true
        return resolved.replace(clientDir, '')
      },
    }),

    IncludePlugin({ root: clientDir, encoding: 'utf8' }),

    require('posthtml-expressions')({
      scopeTags: ['context'],
      locals: {
        site: ctx.site,
        globFiles(pattern: string) {
          const files = glob.sync(pattern, {
            cwd: filesDir
          }).map(file => `/files/${file}`)
          files.sort((a, b) => a.localeCompare(b))
          return files
        }
      }
    }),

    i18n.posthtmlPlugin({ Translation, ctx }),
  ])
}

export function resolveAsset (assetPath: string) {
  var filename = assetPath.startsWith('/files/')
    ? path.join(filesDir, assetPath.replace('/files/', ''))
    : path.join(clientDir, assetPath)

  if ( filename[filename.length-1] === '/' ) {
    filename += 'index.html'
  }
  else if ( path.basename(filename).indexOf('.') === -1 ) {
    filename += '.html'
  }

  if ( !filename.startsWith(filesDir) && !filename.startsWith(clientDir) ) {
    throw new Error('Access denied')
  }
  if ( path.basename(filename)[0] === '_' ) {
    throw new Error('Access denied (partial)')
  }
  return filename
}
