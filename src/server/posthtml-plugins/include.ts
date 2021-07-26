import fs from 'fs'
import path from 'path'
import { clientDir, hydrateDir, siteConfig, sourceDir } from '../config.js'
import { requireLatest, requireUserland } from '../lib/fs.js'
import { buildHydrateScript, buildSsrFile, evalExpression } from '../lib/ssr.js'
import { checksumFile } from '../lib/util.js'


export async function renderUniversalJs(src: string, attrs: object, locals: object) {
  // TODO: Optimize file reading
  const source = fs.readFileSync(src, 'utf-8')
  if (/from 'mithril'/.test(source)) {
    return await wrapMithril(src, attrs, locals)
  }
  else {
    throw new Error(`[Lancer] Could not detect JS runtime for ${src}`)
  }
}

async function wrapMithril(file: string, nodeAttrs: any, locals: object) {
  // Make mithril happy
  const g = global as any
  if (!g.window) {
    g.window = g.document = g.requestAnimationFrame = undefined
  }

  const site = siteConfig()
  const outfile = await buildSsrFile(file, site)
  const mount = requireLatest(outfile).module.default

  const m = requireUserland(sourceDir, 'mithril')
  m.redraw = () => {}

  const renderMithril = requireUserland(sourceDir, 'mithril-node-render')

  const args = evalExpression(locals, nodeAttrs.args || '{}')
  delete nodeAttrs.args

  const html = await renderMithril.sync(mount({ dom: null, args }))
  const hash = await checksumFile(file)

  const hydrateFile = path.join(hydrateDir, file.replace(clientDir, ''))
    .replace(/\.(ts|js)x?$/, '.js')
    .replace(/\.js$/, `-${hash}.hydrate.js`)

  const hydrateSource = `import m from 'mithril'
import mount from '${file}'
var hash = 'h${hash}'
mount({
  dom: document.querySelector(\`[data-mount-id=\${hash}]\`),
  args: C_ARGS[hash]
})
`

  await buildHydrateScript(hydrateSource, hydrateFile, site)

  const mountTargetTag = nodeAttrs.tag || 'div'
  delete nodeAttrs.tag

  return [
    {
      tag: mountTargetTag,
      attrs: { ...nodeAttrs, 'data-mount-id': `h${hash}` },
      content: [html],
    },
    {
      tag: 'script',
      content: [`(window.C_ARGS || (window.C_ARGS={})).h${hash}=${JSON.stringify(args)}`]
    },
    {
      tag: 'script',
      attrs: {
        defer: true as const,
        src: hydrateFile.replace(hydrateDir, ''),
      }
    },
  ]
}
