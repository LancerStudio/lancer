import parser from '@lancer/posthtml-parser'
import fs from 'fs'
import vm from 'vm'
import path from 'path'
import { clientDir, hydrateDir, sourceDir } from '../config'
import { requireLatest, requireUserland } from '../lib/fs'
import { POSTHTML_OPTIONS } from '../lib/posthtml'
import { buildHydrateScript, buildSsrFile } from '../lib/ssr'
import { checksumFile } from '../lib/util'
const {match} = require('posthtml/lib/api')

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
    tree.parser = tree.parser || parser
    tree.match = tree.match || match

    const tasks: Promise<any>[] = []

    tree.match({tag: 'include'}, (node: any) => {
      let src = node.attrs.src || false
      delete node.attrs.src
      let subtree
      let source

      const newNode = {
        tag: false,
        content: undefined as any
      }

      if (src) {
        src = path.resolve(root, src)
        source = fs.readFileSync(src, encoding as BufferEncoding)

        if (src.match(/\.html$/)) {
          subtree = (tree.parser as typeof parser)(source, {
            customVoidElements: POSTHTML_OPTIONS.customVoidElements,
          }) as any
          subtree.match = tree.match
          subtree.parser = tree.parser
          newNode.content = source.includes('include') ? posthtmlInclude(subtree) : subtree
        }
        else if (src.match(/\.(js|ts)$/)) {
          // TODO: Optimize file reading
          if (/from 'mithril'/.test(source)) {
            tasks.push(async function() {
              newNode.content = await wrapMithril(src, node.attrs, locals)
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
  const outfile = await buildSsrFile(file)
  const component = requireLatest(outfile).module.default

  const m = requireUserland(sourceDir, 'mithril')
  const renderMithril = requireUserland(sourceDir, 'mithril-node-render')

  const args = vm.runInNewContext(`_$_=${nodeAttrs.args || '{}'}`, locals, { microtaskMode: 'afterEvaluate' })
  delete nodeAttrs.args

  const html = await renderMithril.sync(m(component, args))
  const hash = await checksumFile(file)

  const hydrateFile = path.join(hydrateDir, file.replace(clientDir, ''))
    .replace(/\.ts$/, '.js')
    .replace(/\.js$/, `-${hash}.hydrate.js`)

  const tmpFile = hydrateFile.replace(/\.hydrate\.js$/, '.hydrate.tmp.js')
  await fs.promises.writeFile(tmpFile,
`import m from 'mithril'
import component from '${file}'
var hash = 'h${hash}'
m.mount(document.querySelector(\`[data-mount-id=\${hash}]\`), {
  view: () => m(component, C_ARGS[hash])
})
`
  )
  await buildHydrateScript(tmpFile, hydrateFile)

  const mountTargetTag = nodeAttrs.tag || 'div'
  delete nodeAttrs.tag

  return [
    {
      tag: mountTargetTag,
      attrs: { ...nodeAttrs, 'data-mount-id': `h${hash}` },
      content: html,
    },
    {
      tag: 'script',
      content: `(window.C_ARGS || (window.C_ARGS={})).h${hash}=${JSON.stringify(args)}`
    },
    {
      tag: 'script',
      attrs: {
        async: true,
        src: hydrateFile.replace(hydrateDir, ''),
      }
    },
  ]
}
