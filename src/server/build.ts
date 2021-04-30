import glob from 'glob'
import path from 'path'
import { readFileSync, promises as fs, mkdirSync, readdirSync, copyFileSync, lstatSync, existsSync } from 'fs'
import { buildSync } from 'esbuild'

import { bundleScriptProd, bundleStyle, posthtmlPlugin } from './bundle'
import { clientDir, siteConfig, buildDir, sourceDir, staticDir, filesDir } from './config'
import { makeLocals, renderPostHtmlPlugins, resolveAsset } from './render'
import { POSTHTML_OPTIONS } from './lib/posthtml'
import { ssr } from './lib/ssr'
import { hashContent } from './lib/util'
import { isRelative } from './lib/fs'

type Options = {
  goStatic?: boolean
}
export async function buildForProduction({ goStatic }: Options = {}) {
  console.log("Build dir:", buildDir)
  await fs.rmdir(buildDir, { recursive: true })
  mkdirSync(buildDir, { recursive: true })

  const buildCache = {} as Record<string,Promise<string>>

  const site = siteConfig()

  let filename: string

  const bundlePlugin = posthtmlPlugin({
    resolveScript: function (scriptPath: string) {
      const resolved = resolveAsset(scriptPath, filename)
      if (buildCache[resolved]) return buildCache[resolved]!

      return buildCache[resolved] = async function() {
        // esbuild code splitting is still experimental, so we're only dealing with one file
        const result = bundleScriptProd(resolved, buildDir).outputFiles[0]!

        const publicPath = result.path.replace(buildDir, '')
        console.log(`  - ${resolved.replace(clientDir, '')}\t-> ${publicPath}`)

        const dest = path.join(buildDir, publicPath)
        await fs.mkdir(path.dirname(dest), { recursive: true })
        await fs.writeFile(dest, result.contents)

        return isRelative(scriptPath) ? path.join(path.dirname(scriptPath), path.basename(publicPath)) : publicPath
      }()
    },
    resolveStyle: function (stylePath: string) {
      const resolved = resolveAsset(stylePath, filename)
      if (buildCache[resolved]) return buildCache[resolved]!

      return buildCache[resolved] = async function () {
        const css = await bundleStyle(sourceDir, resolved)
        if (!css) {
          throw new Error(`Failed to compile ${resolved}`)
        }
        const minifiedCss = buildSync({
          stdin: {
            contents: css,
            loader: 'css',
          },
          write: false,
          minify: true,
        }).outputFiles[0]!.contents

        const publicPath = path.join(
          path.dirname(resolved.replace(clientDir, '')),
          path.basename(resolved).replace('.css', `-${hashContent(minifiedCss)}.css`)
        )
        console.log(`  - ${resolved.replace(clientDir, '')}\t-> ${publicPath}`)

        const dest = path.join(buildDir, publicPath)
        await fs.mkdir(path.dirname(dest), { recursive: true })

        await fs.writeFile(dest, minifiedCss)

        return isRelative(stylePath) ? path.join(path.dirname(stylePath), path.basename(publicPath)) : publicPath
      }()
    },
  })

  for (filename of glob.sync(path.join(clientDir, '/**/*.html'))) {
    if (path.basename(filename)[0] === '_') continue
    if (filename.startsWith(staticDir)) continue

    const reqPath = filename
      .replace(clientDir, '')
      .replace('/index.html', '/')
      .replace(/\/index\.html$/, '')
      .replace(/\.html$/, '')

    console.log('\n', filename.replace(clientDir, 'client'), '->', reqPath)

    const ctx = {
      user: null,
      cache: {},
      locale: site.locales[0]!,
      site: site,
      reqPath,
      filename: filename,
    }
    const locals = makeLocals(ctx)
    const plugins = renderPostHtmlPlugins(locals, {
      prefix: [
        bundlePlugin
      ]
    })

    await ssr({ locals, ctx })

    const result = await require('posthtml')(plugins).process(readFileSync(filename, 'utf8'), POSTHTML_OPTIONS)

    if (goStatic) {
      const dest = path.join(buildDir, filename.replace(clientDir, ''))
      await fs.mkdir(path.dirname(dest), { recursive: true })
      await fs.writeFile(dest, result.html)
    }
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
