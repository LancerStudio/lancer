import path from 'path'
import { build, buildSync } from 'esbuild'
import { existsSync, promises as fs, statSync } from 'fs'

import { requireLatestOptional } from './lib/fs'
import { notNullish } from './lib/util'
import { siteConfig } from './config'

const isProd = process.env.NODE_ENV === 'production'
const matchHelper = require('posthtml-match-helper')
const PostCSS = require('postcss')

//
// <script> and <link> tag rewriting
//
type PostHtmlOptions = {
  resolveScript: (bundlePath: string) => Promise<string>
  resolveStyle: (bundlePath: string) => Promise<string>
}
export function posthtmlPlugin(options: PostHtmlOptions) {
  return async function extendAttrs(tree: any) {
    const tasks: Promise<any>[] = []

    tree.match(matchHelper('script[bundle]'), function(node: any) {
      tasks.push(async function() {
        node.attrs.src = await options.resolveScript(node.attrs.bundle)
        delete node.attrs.bundle
      }())
      return node
    })

    tree.match(matchHelper('link[bundle]'), function(node: any) {
      tasks.push(async function() {
        node.attrs.href = await options.resolveStyle(node.attrs.bundle)
        delete node.attrs.bundle
      }())
      return node
    })

    await Promise.all(tasks)
  }
}

//
// Script bundling
//
export async function bundleScript(file: string) {
  const isProd = process.env.NODE_ENV === 'production'
  const result = await build({
    entryPoints: [file],
    bundle: true,
    write: false,
    minify: isProd,
    outdir: 'out',
    define: {
      'process.env.NODE_ENV': `"${isProd ? 'production' : 'development'}"`
    }
  })
  return result.outputFiles[0]!.contents
}

export function bundleScriptProd(file: string, outdir: string) {
  return buildSync({
    entryPoints: [file],
    entryNames: '[dir]/[name]-[hash]',
    bundle: true,
    write: false,
    minify: true,
    outdir: outdir,
    define: {
      'process.env.NODE_ENV': `"production"`
    }
  })
}


//
// Style bundling
//
const styleCache: Record<string, { mtimeMs: number, css: string }> = {}
const styleDepRecord: Record<string, { file: string, mtimeMs: number }[]> = {}

const importPlugin = (sourceDir: string, rootFile: string) =>
  require("postcss-import")({
    load(filename: string) {
      if (filename.startsWith(sourceDir) && existsSync(filename)) {
        styleDepRecord[rootFile]!.push({
          file: filename,
          mtimeMs: statSync(filename).mtimeMs,
        })
      }
      return require('postcss-import/lib/load-content')(filename)
    }
  })


const postcss = (sourceDir: string, rootFile: string, twConfig: object | null) => PostCSS([
  importPlugin(sourceDir, rootFile),
  twConfig && require('tailwindcss')(twConfig),
  require('autoprefixer'),
].filter(notNullish))

export async function bundleStyle(sourceDir: string, file: string): Promise<string | null> {
  const twConfig = requireLatestOptional(path.join(sourceDir, 'tailwind.config.js'))
  const postCssConfig = requireLatestOptional(path.join(sourceDir, 'postcss.config.js'))
  const styleStat = await fs.stat(file)
  const prev = styleCache[file]
  const deps = styleDepRecord[file]

  if (
    siteConfig().cacheCssInDev !== false &&
    prev &&
    styleStat.mtimeMs - prev.mtimeMs === 0 &&
    (!twConfig || !twConfig.fresh) &&
    (!postCssConfig || !postCssConfig.fresh) &&
    (
      !deps ||
      deps.every(dep => existsSync(dep.file) && statSync(dep.file).mtimeMs === dep.mtimeMs)
    )
  ) {
    return prev.css
  }
  const css = await fs.readFile(file, 'utf8')
  try {
    styleDepRecord[file] = []

    const plugins = postCssConfig?.module?.plugins

    const plan = plugins
      ? PostCSS([importPlugin(sourceDir, file)].concat(
          Array.isArray(plugins) ? plugins : convertPluginsObjToArray(sourceDir, plugins)
        ))
      : postcss(sourceDir, file, twConfig && twConfig.module)

    const result = await plan.process(css, {
      from: file,
      to: file,
      map: { inline: ! isProd },
    })
    styleCache[file] = {
      mtimeMs: styleStat.mtimeMs,
      css: result.css,
    }
    return result.css
  }
  catch(error) {
    if ( error.name === 'CssSyntaxError' ) {
      process.stderr.write(error.message + error.showSourceCode())
      return null
    } else {
      throw error
    }
  }
}

function convertPluginsObjToArray(sourceDir: string, obj: any) {
  const paths = [sourceDir, path.join(__dirname, '../..')]
  return Object.keys(obj).map(pluginName =>
    require( require.resolve(pluginName, { paths }) )(obj[pluginName])
  )
}
