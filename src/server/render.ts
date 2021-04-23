import path from 'path'
import glob from 'glob'
import imageSize from 'image-size'

import * as Bundle from './bundle'
import * as i18n from './i18n'
import IncludePlugin from './posthtml-plugins/include'
import LayoutPlugin from './posthtml-plugins/layout'
import { clientDir, filesDir, PostHtmlCtx } from "./config"
import { POSTHTML_OPTIONS } from './lib/posthtml'
import { ssr } from './lib/ssr'

export const validStyleBundles: Record<string, boolean> = {}
export const validScriptBundles: Record<string, boolean> = {}


export async function render(html: string, ctx: PostHtmlCtx) {
  const { Translation } = require('./models')

  const locals = makeLocals(ctx)

  await ssr({ locals, ctx })

  const plugins = renderPostHtmlPlugins(locals, {
    prefix: [
      Bundle.posthtmlPlugin({
        resolveScript: async function (scriptPath: string) {
          var resolved = resolveAsset(scriptPath)
          validScriptBundles[resolved] = true
          return resolved.replace(clientDir, '')
        },
        resolveStyle: async function (stylePath: string) {
          var resolved = resolveAsset(stylePath)
          validStyleBundles[resolved] = true
          return resolved.replace(clientDir, '')
        },
      }),
    ],
    postfix: [
      i18n.posthtmlPlugin({ Translation, ctx }),
    ]
  })
  const result = await require('posthtml')(plugins).process(html, POSTHTML_OPTIONS)
  return result.html as string
}

export function renderPostHtmlPlugins(locals: any, opts: {
  prefix: ((tree: any) => void)[],
  postfix?: ((tree: any) => void)[],
}) {
  return [
    LayoutPlugin({
      onPageAttrs(attrs) {
        locals.page = { ...attrs, ...locals.page }
      }
    }),
    ...opts.prefix,
    IncludePlugin({ locals, root: clientDir, encoding: 'utf8' }),

    require('posthtml-expressions')({
      scopeTags: ['context'],
      locals,
    }),

    ...(opts.postfix || []),
  ]
}

export function makeLocals(ctx: PostHtmlCtx) {
  const globClient = globDir(clientDir, '/')

  const locals = {
    currentUser: ctx.user,

    site: ctx.site,

    page: {
      path: ctx.reqPath,
      locale: ctx.locale,
      fullPath: path.join('/', ctx.locale, ctx.reqPath),
    },

    pathFor(locale: string, path?: string) {
      return `/${locale}${path || ctx.reqPath}`
    },

    getLang: i18n.getLang,

    globFiles: globDir(filesDir, '/files/'),
    globClient(pattern: string) {
      const files = globClient(pattern)
      //
      // Read and assign page attributes for html files
      //
      const RL = require('n-readlines')
      return files.map(file => {
        if (!file.file.endsWith('.html')) return file

        const lines = new RL(file.file)
        let pageTag = ''
        let rawLine: Buffer
        while (rawLine = lines.next()) {
          const line = rawLine.toString('utf8')
          if (line.match(/^\w*$/)) continue
          if (!line.match(/^\w*<page\b/)) break

          pageTag = line
          while (rawLine = lines.next()) {
            pageTag += '\n' + rawLine.toString('utf8')
            if (pageTag.indexOf('>') >= 0) break
          }

          let pageAttrs: any
          const parser = new (require("htmlparser2").Parser)({
            onopentag(name: string, attrs: any) {
              if (name === 'page') pageAttrs = attrs
            }
          })
          parser.write(pageTag)
          parser.end()

          return { ...file, attrs: pageAttrs }
        }
        return file
      })
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

  return locals
}

const globDir = (dir: string, srcPath: string) => (pattern: string) => {
  const files = glob.sync(pattern, {
    cwd: dir
  })
  .map(file => ({
    href: `${srcPath}${file}`,
    file: path.join(dir, file),
  }))
  files.sort((a, b) => a.file.localeCompare(b.file))
  return files
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
  if ( path.basename(filename)[0] === '_' && filename.endsWith('html') ) {
    throw new Error('Access denied (partial)')
  }
  return filename
}
