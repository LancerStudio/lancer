import fs from 'fs'
import vm from 'vm'
import path from 'path'
import { building, clientDir, env, PostHtmlCtx, siteConfig, sourceDir, ssrDir } from '../config.js'
import { build, Plugin } from 'esbuild'
import { requireLatest } from './fs.js'
import colors from 'kleur'
import { checksumFile, checksumString } from './util.js'

type SsrContext = {
  ctx: PostHtmlCtx
  req?: import('express').Request
  locals: any
}
type Inputs = {
  ctx: PostHtmlCtx
  locals: any
  dryRun?: boolean
}
export async function ssr({ctx, locals, dryRun}: Inputs) {
  let ssrFile = ctx.filename.replace(/\.html$/, '.server.js')

  if (!fs.existsSync(ssrFile)) ssrFile = ctx.filename.replace(/\.html$/, '.server.ts')
  if (!fs.existsSync(ssrFile)) return false

  const site = siteConfig()
  const outfile = await buildSsrFile(ssrFile, site)

  const ssrContext: SsrContext = {
    ctx,
    req: ctx.req,
    locals,
  }

  const render = requireLatest(outfile).module.default
  if (typeof render !== 'function') {
    return false
  }

  if (dryRun !== true) {
    const start = Date.now()
    await render(ssrContext)
    console.log(`         ${colors.cyan('run')} ${ssrFile.replace(clientDir, 'client')} - ${colors.green(Date.now() - start + 'ms')}`)
  }

  return { buildFile: outfile }
}

type Config = {
  jsxFactory?: string
  jsxFragment?: string
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
    plugins: [makeAllPackagesExternalPlugin],
    jsxFactory: config.jsxFactory,
    jsxFragment: config.jsxFragment,
    platform: 'node',
  })

  if (!building) {
    // Don't write unless necessary so in-memory data structures don't get clobbered
    const oldCheck = fs.existsSync(outfile) && await checksumFile(outfile)
    const newCheck = checksumString(output.outputFiles!.find(out => out.path === outfile)!.text)

    if (newCheck !== oldCheck) {
      await Promise.all(
        output.outputFiles!.map(({ path: filename, contents }) => {
          fs.mkdirSync(path.dirname(filename), { recursive: true })
          return fs.promises.writeFile(filename, contents)
        })
      )
    }
  }

  return outfile
}

export async function buildHydrateScript(hydrateSource: string, outfile: string, config: Config) {
  const isProd = process.env.NODE_ENV === 'production'

  await build({
    stdin: {
      contents: hydrateSource,
      loader: 'js',
      resolveDir: sourceDir,
    },
    entryNames: path.basename(outfile).replace(/\.js$/, ''),
    outdir: path.dirname(outfile),
    write: true,
    bundle: true,
    minify: isProd,
    sourcemap: true,
    plugins: [injectRpcsPlugin],
    define: {
      'process.env.NODE_ENV': `"${isProd ? 'production' : 'development'}"`
    },
    jsxFactory: config.jsxFactory,
    jsxFragment: config.jsxFragment,
  })
}

export function ssrBuildFile(ssrFile: string) {
  return path.join(ssrDir, ssrFile.replace(clientDir, '')).replace(/\.(js|ts)x?$/, '.js')
}

export function evalExpression(locals: vm.Context, code: string) {
  return vm.runInNewContext(`_$_=${code}`, locals, { microtaskMode: 'afterEvaluate' })
}

// https://github.com/evanw/esbuild/issues/619#issuecomment-751995294
const makeAllPackagesExternalPlugin: Plugin = {
  name: 'make-all-packages-external',
  setup(build) {
    let filter = /^[^.\/]|^\.[^.\/]|^\.\.[^\/]/ // Must not start with "/" or "./" or "../"
    build.onResolve({ filter }, args => ({ path: args.path, external: true }))
  },
}

const injectRpcsPlugin: Plugin = {
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
    return res.headers.get('Content-Type').match('application/json') ? res.json() : res.text()
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
