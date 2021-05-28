import fs from 'fs'
import path from 'path'
import { NodeTag, parseIHTML } from '../lib/posthtml.js'
import { clientDir, hydrateDir, siteConfig, sourceDir } from '../config.js'
import { requireLatest, requireUserland } from '../lib/fs.js'
import { POSTHTML_OPTIONS } from '../lib/posthtml.js'
import { buildHydrateScript, buildSsrFile, evalExpression } from '../lib/ssr.js'
import { checksumFile } from '../lib/util.js'
import { match } from 'posthtml/lib/api.js'

type Options = {
  root?: string
  locals?: object
  encoding?: string
}
export default (options: Options = {}) => {
  const root = options.root || './'
  const locals = options.locals || {}
  const encoding = options.encoding || 'utf-8'

  return async function posthtmlInclude(tree: any) {
    tree.parser = tree.parser || parseIHTML
    tree.match = tree.match || match

    const tasks: Promise<any>[] = []

    tree.match({tag: 'include'}, (node: any) => {
      const attrs = node.attrs || {}
      let src = attrs.src || false
      delete attrs.src
      let subtree
      let source

      let newNode: NodeTag = {
        tag: false,
        content: undefined,
      }

      if (src) {
        src = path.resolve(root, src)
        source = fs.readFileSync(src, encoding as BufferEncoding)

        if (src.match(/\.html$/)) {
          subtree = parseIHTML(source, {
            customVoidElements: POSTHTML_OPTIONS.customVoidElements,
          }) as any
          subtree.match = tree.match
          subtree.parser = tree.parser

          if (source.includes('include')) {
            tasks.push(async function() {
              newNode.content = await posthtmlInclude(subtree)
            }())
          }
          else {
            newNode.content = subtree
          }

          if (attrs.locals) {
            newNode = {
              tag: 'scope',
              attrs: { locals: attrs.locals },
              content: [newNode],
            }
          }
        }
        else if (src.match(/\.(js|ts)x?$/)) {
          // TODO: Optimize file reading
          if (/from 'mithril'/.test(source)) {
            tasks.push(async function() {
              newNode.content = await wrapMithril(src, attrs, locals)
            }())
          }
          else {
            throw new Error(`[Lancer] Could not detect JS runtime for ${src}`)
          }
        }


        if (tree.messages) {
          tree.messages.push({
            type: 'dependency',
            file: src
          })
        }
      }

      return newNode
    })

    await Promise.all(tasks)

    return tree
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
