import path from 'path'
import { build, Plugin } from 'esbuild'
import { existsSync, mkdirSync, promises as fs, statSync } from 'fs'

import { makeDirname, requireLatest, requireLatestOptional, requireResolveUserland, requireUserland } from './lib/fs.js'
import { notNullish } from './lib/util.js'
import { building, clientDir, env, siteConfig, sourceDir, ssrDir } from './config.js'

import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const isProd = process.env.NODE_ENV === 'production'
import PostCSS from 'postcss'
import { loadCollectionItems, simplifyCollectionItem } from './lib/collections.js'
import { checksumFile, checksumString } from './lib/util.js'

const __dirname = makeDirname(import.meta.url)

const VALID_ENV_KEY_RE = /^[a-zA-Z_][a-zA-Z_0-9]*$/

//
// Script bundling
//
type Config = {
  jsxFactory?: string
  jsxFragment?: string
}
export async function bundleScript(file: string, config: Config) {
  const isProd = process.env.NODE_ENV === 'production'
  const result = await build({
    platform: 'browser',
    entryPoints: [file],
    bundle: true,
    write: false,
    minify: isProd,
    outdir: 'out',
    loader: {
      '.html': 'js'
    },
    define: {
      ...Object.keys(process.env).reduce((all, key) => {
        if (VALID_ENV_KEY_RE.test(key)) {
          all[`process.env.${key}`] = JSON.stringify(process.env[key])
        }
        return all
      }, {} as any),
    },
    jsxFactory: config.jsxFactory,
    jsxFragment: config.jsxFragment,
    plugins: [bundleAliasesPlugin, injectRpcsPlugin, injectCollectionsPlugin],
  })
  return result.outputFiles[0]!.contents
}

export async function bundleScriptProd(file: string, outdir: string, config: Config) {
  return await build({
    platform: 'browser',
    entryPoints: [file],
    entryNames: '[dir]/[name]-[hash]',
    bundle: true,
    write: false,
    minify: true,
    outdir: outdir,
    loader: {
      '.html': 'js'
    },
    define: {
      ...Object.keys(process.env).reduce((all, key) => {
        all[`process.env.${key}`] = JSON.stringify(process.env[key])
        return all
      }, {} as any),
    },
    jsxFactory: config.jsxFactory,
    jsxFragment: config.jsxFragment,
    plugins: [bundleAliasesPlugin, injectRpcsPlugin, injectCollectionsPlugin],
  })
}

export async function buildSsrFile(ssrFile: string, config: Config) {
  const outfile = ssrBuildFile(ssrFile)

  if (env.production && !building) {
    return outfile
  }

  const output = await build({
    entryPoints: [ssrFile],
    outdir: path.dirname(outfile),
    write: building,
    bundle: true,
    format: 'cjs',
    sourcemap: true,
    loader: {
      '.html': 'js'
    },
    plugins: [makeAllPackagesExternalPlugin, injectCollectionsPlugin],
    jsxFactory: config.jsxFactory,
    jsxFragment: config.jsxFragment,
    platform: 'node',
  })

  if (!building) {
    // Don't write unless necessary so in-memory data structures don't get clobbered
    const oldCheck = existsSync(outfile) && await checksumFile(outfile)
    const newCheck = checksumString(output.outputFiles!.find(out => out.path === outfile)!.text)

    if (newCheck !== oldCheck) {
      await Promise.all(
        output.outputFiles!.map(({ path: filename, contents }) => {
          mkdirSync(path.dirname(filename), { recursive: true })
          return fs.writeFile(filename, contents)
        })
      )
    }
  }

  return outfile
}

export function ssrBuildFile(ssrFile: string) {
  return path.join(ssrDir, ssrFile.replace(clientDir, '')).replace(/\.(js|ts)x?$/, '.js')
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
  twConfig && requireUserland(sourceDir, 'tailwindcss')(twConfig),
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
    (!twConfig || twConfig.fresh !== true && twConfig.module.mode !== 'jit') &&
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

const INJECT_FILTER_RE = /[\/\\]collections[\/\\](.+)\.html$/

export const injectCollectionsPlugin: Plugin = {
  name: 'inject-collections',
  setup(build) {
    const config = siteConfig()
    const location = new URL(`${config.origin || 'http://static.example.com'}`)

    build.onLoad({ filter: INJECT_FILTER_RE }, async args => {
      const collectionName = args.path.match(INJECT_FILTER_RE)![1]!
      const items = loadCollectionItems(collectionName, { host: location.host, protocol: location.protocol })
      return {
        contents: `export default ${JSON.stringify(items.map(simplifyCollectionItem))}`
      }
    })
  },
}

export const injectRpcsPlugin: Plugin = {
  name: 'inject-rpcs',
  setup(build) {
    let filter = /\.server\.(js|ts)$/
    build.onLoad({ filter }, async args => {
      // TODO: Buildtime cache
      const outfile = await buildSsrFile(args.path, siteConfig())
      return {
        contents: makeRpcFile(args.path, Object.keys(requireLatest(outfile).module))
      }
    })
  },
}

export const bundleAliasesPlugin: Plugin = {
  name: 'bundle-aliases',
  setup(build) {
    const site = siteConfig()
    const mapping = site.bundleAliases
    if (Object.keys(mapping).length) {
      const filter = new RegExp(`^(${Object.keys(mapping).join('|')})$`)

      build.onResolve({ filter }, args => {
        const [type, dest] = mapping[args.path]!.split(':')
        if (type === 'npm') {
          return { path: requireResolveUserland(sourceDir, dest!) }
        }
        else {
          throw new Error(`[Lancer] Invalid bundle alias type: ${type}`)
        }
      })
    }
  },
}

function makeRpcFile(sourcePath: string, methods: string[]) {
  return (
`export const namespace = '${sourcePath.replace(clientDir+'/', '').replace(/\.(js|ts)$/, '')}'
const _rpc = (method) => async (...args) => {
  const res = await fetch('/lrpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ namespace, method, args }),
  })
  if (res.status === 204) return
  else if (res.status === 200) {
    const contentType = res.headers.get('Content-Type')
    return contentType && contentType.match('application/json') ? res.json() : res.text()
  }
  else {
    const err = new Error(\`[\${namespace}/rpc] Status code \${res.status}\`)
    err.res = res
    throw err
  }
}
${methods.filter(m => m !== 'default').map(m => `export const ${m} = _rpc('${m}')`).join('\n')}
`
  )
}

// https://github.com/evanw/esbuild/issues/619#issuecomment-751995294
const makeAllPackagesExternalPlugin: Plugin = {
  name: 'make-all-packages-external',
  setup(build) {
    let filter = /^[^.\/A-Z]|^\.[^.\/]|^\.\.[^\/]|^[A-Z][^:]/ // Must not start with "/" or "./" or "../" or "C:"
    build.onResolve({ filter }, args => ({ path: args.path, external: true }))
  },
}
