import fs from 'fs'
import vm from 'vm'
import path from 'path'
import { cacheDir, clientDir, PostHtmlCtx } from "../config"
import { build, Plugin } from 'esbuild'
import { requireLatest } from './fs'
import { cyan, green } from 'kleur'

const placeholders = require('posthtml-expressions/lib/placeholders')

type SsrContext = {
  ctx: PostHtmlCtx
  req?: Request
  locals: any
}
type Inputs = {
  ctx: PostHtmlCtx
  locals: any
}
export async function ssr({ctx, locals}: Inputs) {
  let ssrFile = ctx.filename.replace(/\.html$/, '.server.js')

  if (!fs.existsSync(ssrFile)) ssrFile = ctx.filename.replace(/\.html$/, '.server.ts')
  if (!fs.existsSync(ssrFile)) return false

  const outfile = await buildSsrFile(ssrFile)

  const ssrContext: SsrContext = {
    ctx,
    req: ctx.req,
    locals,
  }

  const render = requireLatest(outfile).module.default
  if (typeof render !== 'function') {
    throw new Error(`[Lancer] Please export a default function from ${ssrFile.replace(clientDir, 'client')}`)
  }

  const start = Date.now()
  await render(ssrContext)
  console.log(`         ${cyan('run')} ${ssrFile.replace(clientDir, 'client')} - ${green(Date.now() - start + 'ms')}`)

  return true
}

export async function buildSsrFile(ssrFile: string) {
  const outfile = ssrBuildFile(ssrFile)

  await build({
    entryPoints: [ssrFile],
    outdir: path.dirname(outfile),
    write: true,
    bundle: true,
    format: 'cjs',
    sourcemap: true,
    plugins: [makeAllPackagesExternalPlugin],
  })

  return outfile
}

export async function buildHydrateScript(ssrFile: string, outfile: string) {
  const isProd = process.env.NODE_ENV === 'production'

  await build({
    entryPoints: [ssrFile],
    entryNames: path.basename(outfile).replace(/\.js$/, ''),
    outdir: path.dirname(outfile),
    write: true,
    bundle: true,
    minify: isProd,
    sourcemap: true,
    plugins: [injectRpcsPlugin],
    define: {
      'process.env.NODE_ENV': `"${isProd ? 'production' : 'development'}"`
    }
  })
}

export function ssrBuildFile(ssrFile: string) {
  return path.join(cacheDir, 'ssr', ssrFile.replace(clientDir, '')).replace(/\.ts$/, '.js')
}

export function runInContext(locals: object, code: string) {
  return vm.runInNewContext(`_$_=${code}`, locals, { microtaskMode: 'afterEvaluate' })
}

export function interpolate(locals: object, template: string) {
  return placeholders(template, vm.createContext(locals), delimiters, { strictMode: true })
}
// Mirror shape in posthtml-expressions
// NOTE: Sort these by length desc
const delimiters = [
  { text: ['{{{', '}}}'], regexp: new RegExp(`(?<!@)${escapeRegexpString('{{{')}(.+?)${escapeRegexpString('}}}')}`, 'g'), escape: false },
  { text: ['{{', '}}'], regexp: new RegExp(`(?<!@)${escapeRegexpString('{{')}(.+?)${escapeRegexpString('}}')}`, 'g'), escape: true },
]
function escapeRegexpString (input: string) {
  // match Operators
  const match = /[|\\{}()[\]^$+*?.]/g

  return input.replace(match, '\\$&')
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
    build.onLoad({ filter }, args => ({
      contents: makeRpcFile(args.path, Object.keys(requireLatest(ssrBuildFile(args.path)).module))
    }))
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
