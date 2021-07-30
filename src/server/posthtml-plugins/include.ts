import fs from 'fs'
import path from 'path'
import { buildSsrFile } from '../bundle.js'
import { building, clientDir, env, hydrateDir, SiteConfig, siteConfig, sourceDir } from '../config.js'
import { requireLatest, requireUserland } from '../lib/fs.js'
import { bundleHydrateScript, evalExpression } from '../lib/ssr.js'
import { checksumFile } from '../lib/util.js'

export const JS_FILE_RE = /\.(js|ts)x?$/

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

/** For use in building for production */
export async function buildUniversalScript(file: string) {
  const source = fs.readFileSync(file, 'utf-8')
  if (/from 'mithril'/.test(source)) {
    const site = siteConfig()
    const ssrFile = await buildSsrFile(file, site)
    const { hydrateFile } = await buildMithrilHydrateScript(file, site)
    return { ssrFile, hydrateFile }
  }
  else {
    throw new Error(`[Lancer/build] Could not detect JS runtime for ${file}`)
  }
}

async function buildMithrilHydrateScript(file: string, site: SiteConfig) {
  const hash = await checksumFile(file)
  const hydrateFile = path.join(hydrateDir, file.replace(clientDir, ''))
    .replace(/\.(ts|js)x?$/, '.js')
    .replace(/\.js$/, `-${hash}.hydrate.js`)

  const hydrateSource = `import m from 'mithril'
import mount from '${file}'
window.mount_h${hash} = mount
`

  const skipBuild = env.production && !building
  if (!skipBuild) {
    await bundleHydrateScript(hydrateSource, hydrateFile, site)
  }

  return { hash, hydrateFile }
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
  const {hash, hydrateFile} = await buildMithrilHydrateScript(file, site)

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
      attrs: { src: hydrateFile.replace(hydrateDir, '') }
    },
    {
      tag: 'script',
      content: [
`(function() {
  let hash  = 'h${hash}'
  let hashi = (() => {
    let k = hash+'__i'
    if (!(k in window)) window[k] = -1
    window[k] += 1
    return window[k]
  })()

  window['mount_'+hash]({
    dom: document.querySelectorAll(\`[data-mount-id=\${hash}]\`)[hashi],
    args: ${JSON.stringify(args)}
  })
})()
`
      ]
    },
  ]
}
