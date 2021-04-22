import fs from 'fs'
import path from 'path'
import { cacheDir, clientDir, PostHtmlCtx } from "../config"
import { build } from 'esbuild'
import { requireLatest } from './fs'
import { cyan, green } from 'kleur'

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
  const outfile = path.join(cacheDir, 'ssr', ssrFile.replace(clientDir, '')).replace(/\.ts$/, '.js')

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
    define: {
      'process.env.NODE_ENV': `"${isProd ? 'production' : 'development'}"`
    }
  })
}

// https://github.com/evanw/esbuild/issues/619#issuecomment-751995294
const makeAllPackagesExternalPlugin = {
  name: 'make-all-packages-external',
  setup(build: any) {
    let filter = /^[^.\/]|^\.[^.\/]|^\.\.[^\/]/ // Must not start with "/" or "./" or "../"
    build.onResolve({ filter }, (args: any) => ({ path: args.path, external: true }))
  },
}
