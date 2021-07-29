import path from 'path'
import glob from 'glob'
import imageSize from 'image-size'
import Cookies from 'universal-cookie'
import posthtml from 'posthtml'
import { Response } from 'express'

import * as i18n from './i18n.js'
import LayoutPlugin from './posthtml-plugins/layout.js'
import { building, cacheDir, clientDir, env, filesDir, PostHtmlCtx, staticDir } from './config.js'
import { POSTHTML_OPTIONS } from './lib/posthtml.js'
import { ssr } from './lib/ssr.js'
import { getPageAttrs, isRelative } from './lib/fs.js'
import { LancerCorePlugin } from './posthtml-plugins/core.js'
import { loadCollectionItems, simplifyCollectionItem } from './lib/collections.js'
import { ReplaceAssetPathsPlugin } from './posthtml-plugins/assets.js'

import { createRequire } from 'module'
const require = createRequire(import.meta.url)


let publicAssetPaths = {}

if (env.production && !building) {
  publicAssetPaths = require(path.join(cacheDir, 'public-asset-paths.json'))
}

export async function render(html: string, ctx: PostHtmlCtx, res: Response) {
  const locals = makeLocals(ctx)

  const ssrResult = await ssr({ locals, ctx, res })

  if (
    ssrResult.halted ||
    ctx.req && ctx.req.method === 'POST' && !ssrResult.isSsr
  ) {
    return { isSsr: false, html: '', halted: false }
  }

  const plugins = renderPostHtmlPlugins(ctx, locals, {
    postfix: env.production ? [
      ReplaceAssetPathsPlugin({ publicAssetPaths, file: ctx.filename })
    ] : []
  })
  const result = await posthtml(plugins).process(html, POSTHTML_OPTIONS)
  return {
    isSsr: ssrResult.isSsr,
    html: result.html as string,
  }
}

export function renderPostHtmlPlugins(ctx: PostHtmlCtx, locals: any, opts: {
  prefix?: ((tree: any) => void)[],
  postfix?: ((tree: any) => void)[],
}={}) {
  return [
    LayoutPlugin({
      ctx,
      locals,
      onPageAttrs(attrs) {
        locals.page = { ...attrs, ...locals.page }
      }
    }),
    ...(opts.prefix || []),

    LancerCorePlugin({ locals, site: ctx.site, includeRoot: clientDir }),

    ...(opts.postfix || []),
  ]
}

export function makeLocals(ctx: PostHtmlCtx): object {
  const globClient = globDir(clientDir, '/')

  const locals: any = {
    filesDir,
    clientDir,
    publicDir: staticDir,

    site: ctx.site,

    cookies: ctx.req && new Cookies(ctx.req.headers.cookie),

    // Shallow "copy" to stay clone-able
    process: {
      env: process.env
    },

    page: {
      file: ctx.filename,
      path: ctx.plainPath,
      locale: ctx.locale,
      params: ctx.req ? ctx.req.params || {} : null,
      location: ctx.location,
    },

    locationFor(locale: string, path?: string) {
      return new URL(`${ctx.location.protocol}//${ctx.location.host}/${locale}${path || ctx.plainPath}`)
    },

    getLang: i18n.getLang,

    globFiles: globDir(filesDir, '/files/'),
    globClient(pattern: string) {
      const files = globClient(pattern)
      //
      // Read and assign page attributes for html files
      //
      return files
        .map(file => {
          const plainPath = file.path.replace(/\.html$/, '')
          return {
            file: file.file,
            path: plainPath,
            locale: ctx.locale,
            location: new URL(`${ctx.location.protocol}//${ctx.location.host}/${ctx.locale}${plainPath}`),
          }
        })
        .map(file => {
          if (!file.file.endsWith('.html')) return file

          const pageAttrs = getPageAttrs(file.file)
          if (pageAttrs) {
            return { ...file, attrs: pageAttrs }
          }
          else {
            return file
          }
        })
    },

    getImageDims(imageFile: string) {
      const key = `getImageDims:${imageFile}`
      if (!ctx.cache[key]) {
        try {
          ctx.cache[key] = imageSize(imageFile)
        }
        catch(err) {
          console.warn(`[Lancer/getImageDims] No such image file: ${imageFile}`)
          return {}
        }
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

    ...ctx.site.locals,

    collection(id: string) {
      return loadCollectionItems(id, {
        host: ctx.location.host,
        protocol: ctx.location.protocol,
      }).map(simplifyCollectionItem)
    }
  }

  // For referencing optional values and keywords
  locals.locals = locals

  return locals
}

const globDir = (dir: string, srcPath: string) => (pattern: string) => {
  const opts: glob.IOptions = {
    cwd: dir,
  }
  if (env.development) {
    // Cache per request instead of per server lifetime
    opts.cache = {}
    opts.statCache = {}
  }
  const files = glob.sync(pattern, opts)
  .map(file => ({
    path: `${srcPath}${file}`,
    file: path.join(dir, file),
  }))
  files.sort((a, b) => a.file.localeCompare(b.file))
  return files
}

export function resolveAsset (assetPath: string, fromFile?: string) {
  if (fromFile && isRelative(assetPath)){
    const filename = path.join(path.dirname(fromFile), assetPath)
    if (!filename.startsWith(clientDir)) {
      throw new Error('Access denied')
    }
    return filename
  }
  let filename = assetPath.startsWith('/files/')
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
  if ( filename.replace(clientDir, '').includes('/_') ) {
    throw new Error('Access denied (private)')
  }
  return filename
}
