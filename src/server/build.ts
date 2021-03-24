import { readFileSync, promises as fs, mkdirSync, readdirSync, copyFileSync, lstatSync, existsSync } from 'fs'
import glob from 'glob'
import path from 'path'

import { bundleScript, bundleStyle, posthtmlPlugin } from './bundle'
import { clientDir, siteConfig, buildDir, sourceDir, staticDir, filesDir } from './config'
import { renderPostHtmlPlugins, resolveAsset } from './render'

type Options = {
  goStatic?: boolean
}
export async function buildForProduction({ goStatic }: Options = {}) {
  mkdirSync(buildDir, { recursive: true })
  console.log("Build dir:", buildDir)

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
    if (match.startsWith(staticDir)) continue

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

    const result = posthtml(plugins).process(readFileSync(match, 'utf8'), { sync: true })

    if (goStatic) {
      await fs.writeFile(path.join(buildDir, match.replace(clientDir, '')), result.html)
    }

    await Promise.all([
      Promise.all(styles.map(async publicPath => {
        const css = await bundleStyle(sourceDir, path.join(clientDir, publicPath))
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

  if (goStatic) {
    console.log("\nCopying client/public folder...")
    copyFolderSync(staticDir, buildDir)

    if (existsSync(filesDir)) {
      console.log("\nCopying data/files folder...")
      copyFolderSync(filesDir, path.join(buildDir, 'files'))
    }
  }
}

function copyFolderSync(from: string, to: string) {
  mkdirSync(to, { recursive: true })
  readdirSync(from).forEach(element => {
    if (lstatSync(path.join(from, element)).isFile()) {
      const src = path.join(from, element)

      console.log('  -', src.replace(clientDir, 'client'))
      copyFileSync(src, path.join(to, element))
    } else {
      copyFolderSync(path.join(from, element), path.join(to, element))
    }
  })
}
