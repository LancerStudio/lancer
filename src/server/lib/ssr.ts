import fs from 'fs'
import vm from 'vm'
import path from 'path'
import { Request, Response } from 'express'
import { clientDir, PostHtmlCtx, siteConfig, sourceDir } from '../config.js'
import { build } from 'esbuild'
import { requireLatest } from './fs.js'
import colors from 'kleur'
import { buildSsrFile, injectCollectionsPlugin, injectRpcsPlugin } from '../bundle.js'

type SsrContext = {
  ctx: PostHtmlCtx
  req?: Request
  halt: (handler: (res: Response) => void) => Response | null
  locals: any
}
type Inputs = {
  ctx: PostHtmlCtx
  res?: Response
  locals: any
  dryRun?: boolean
}
export async function ssr({ctx, res, locals, dryRun}: Inputs) {
  let ssrFile = ctx.filename.replace(/\.html$/, '.server.js')

  if (!fs.existsSync(ssrFile)) ssrFile = ctx.filename.replace(/\.html$/, '.server.ts')
  if (!fs.existsSync(ssrFile)) return { isSsr: false, halted: false }

  let halted = false

  const site = siteConfig()
  const outfile = await buildSsrFile(ssrFile, site)

  const ssrContext: SsrContext = {
    ctx,
    req: ctx.req,
    halt: (f) => {
      if (halted) throw new Error(`[Lancer] Already halted`)
      halted = true
      if (f === undefined) {
        return res || null
      }
      else {
        // Backwards compatibility
        if (res) {
          console.warn('[Lancer][warn] halt() with callback is deprecated. Please use `let res = halt();` instead.')
          f(res)
        }
        return null
      }
    },
    locals,
  }

  const render = requireLatest(outfile).module.default
  if (typeof render !== 'function') {
    return { isSsr: false, halted }
  }

  if (dryRun !== true) {
    const start = Date.now()
    await render(ssrContext)
    console.log(`         ${colors.cyan('run')} ${ssrFile.replace(clientDir, 'client')} - ${colors.green(Date.now() - start + 'ms')}`)
  }

  return { isSsr: true, buildFile: outfile, halted }
}

type Config = {
  jsxFactory?: string
  jsxFragment?: string
}

export async function bundleHydrateScript(hydrateSource: string, outfile: string, config: Config) {
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
    plugins: [injectRpcsPlugin, injectCollectionsPlugin],
    loader: {
      '.html': 'js'
    },
    define: {
      'process.env.NODE_ENV': `"${isProd ? 'production' : 'development'}"`
    },
    jsxFactory: config.jsxFactory,
    jsxFragment: config.jsxFragment,
  })
}


export function evalExpression(locals: vm.Context, code: string) {
  return vm.runInNewContext(`_$_=${code}`, locals, { microtaskMode: 'afterEvaluate' })
}
