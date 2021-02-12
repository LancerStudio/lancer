import { readFileSync, promises as fs } from 'fs'
import glob from 'glob'
import path from 'path'

import { bundleScript, bundleStyle, posthtmlPlugin } from './bundle'
import { clientDir, siteConfig, buildDir } from './config'
import { renderPostHtmlPlugins, resolveAsset } from './render'


export async function buildForProduction() {
  const site = siteConfig()
  const styles = [] as string[]
  const scripts = [] as string[]
  const posthtml = require('posthtml')

  const bundlePlugin = posthtmlPlugin({
    resolveScript: function (scriptPath: string) {
      const resolved = resolveAsset(scriptPath)
      const path = resolved.replace(clientDir, '')
      if (path !== '/lancer.js') {
        scripts.push(path)
        console.log('  -', path.replace('/', ''))
      }
      return path
    },
    resolveStyle: function (stylePath: string) {
      const resolved = resolveAsset(stylePath)
      const path = resolved.replace(clientDir, '')
      styles.push(path)
      console.log('  -', path.replace('/', ''))
      return path
    },
  })

  for (const match of glob.sync(path.join(clientDir, '/**/*.html'))) {
    if (path.basename(match)[0] === '_') continue

    const reqPath = match
      .replace(clientDir, '')
      .replace('/index.html', '/')
      .replace(/\/index\.html$/, '')
      .replace(/\.html$/, '')

    console.log(match.replace(clientDir, 'client'), '->', reqPath)

    const plugins = renderPostHtmlPlugins({
      user: null,
      cache: {},
      locale: site.locales[0]!,
      site: site,
      reqPath,
    }, {
      prefix: [
        bundlePlugin
      ]
    })

    posthtml(plugins).process(readFileSync(match, 'utf8'), { sync: true })

    await Promise.all([
      Promise.all(styles.map(async publicPath => {
        const css = await bundleStyle(path.join(clientDir, publicPath))
        if (!css) {
          throw new Error(`Failed to compile ${publicPath}`)
        }
        const dest = path.join(buildDir, publicPath)
        await fs.mkdir(path.dirname(dest), { recursive: true })
        await fs.writeFile(dest, css)
      })),

      Promise.all(scripts.map(async publicPath => {
        const js = await bundleScript(path.join(clientDir, publicPath))
        const dest = path.join(buildDir, publicPath)
        await fs.mkdir(path.dirname(dest), { recursive: true })
        await fs.writeFile(dest, js)
      }))
    ])
  }
}

