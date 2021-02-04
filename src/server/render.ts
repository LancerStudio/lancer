import path from 'path'
import glob from 'glob'
import imageSize from 'image-size'

import * as Bundle from './bundle'
import * as i18n from './i18n'
import IncludePlugin from './posthtml-plugins/include'
import { clientDir, filesDir, PostHtmlCtx } from "./config"
import { Translation } from './models'

export const validStyleBundles: Record<string, boolean> = {}
export const validScriptBundles: Record<string, boolean> = {}


export function render(ctx: PostHtmlCtx) {
  const locals = {
    site: ctx.site,

    globFiles(pattern: string) {
      const files = glob.sync(pattern, {
        cwd: filesDir
      })
      .map(file => ({
        src: `/files/${file}`,
        file: path.join(filesDir, file),
      }))
      files.sort((a, b) => a.file.localeCompare(b.file))
      return files
    },

    getDims(imageFile: string) {
      const key = `getDims:${imageFile}`
      if (!ctx.cache[key]) {
        ctx.cache[key] = imageSize(imageFile)
      }
      const dims = ctx.cache[key]
      /** 6 and 8 are specified by EXIF */
      const isRotated = dims.orientation === 6 || dims.orientation === 8
      const [w, h] = isRotated ? [dims.height, dims.width] : [dims.width, dims.height]
      return {
        type: dims.type,
        width: w,
        height: h,
        asString: `${w}x${h}`
      }
    },
  }
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
      locals,
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