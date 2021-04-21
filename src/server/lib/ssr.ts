import fs from 'fs'
import path from 'path'
import { cacheDir, clientDir, PostHtmlCtx } from "../config"
import { build } from 'esbuild'
import { requireLatest } from './fs'

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

  console.log(`         run ${ssrFile.replace(clientDir, 'client')}`)

  const outfile = path.join(cacheDir, 'ssr', ssrFile.replace(clientDir, '')).replace(/\.ts$/, '.js')

  await build({
    entryPoints: [ssrFile],
    outdir: path.dirname(outfile),
    write: true,
    bundle: false,
    format: 'cjs',
    sourcemap: true,
  })

  const ssrContext: SsrContext = {
    ctx,
    req: ctx.req,
    locals,
  }

  const render = requireLatest(outfile).module.default
  if (typeof render !== 'function') {
    throw new Error(`[Lancer] Please export a default function from ${ssrFile.replace(clientDir, 'client')}`)
  }
  render(ssrContext)
  return true
}
