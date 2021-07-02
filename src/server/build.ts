import glob from 'glob'
import path from 'path'
import posthtml from 'posthtml'
import { readFileSync, promises as fs, mkdirSync, readdirSync, copyFileSync, lstatSync, existsSync } from 'fs'
import { buildSync } from 'esbuild'
import colors from 'kleur'

import { bundleScriptProd, bundleStyle, posthtmlPlugin } from './bundle.js'
import { clientDir, siteConfig, buildDir, sourceDir, staticDir, filesDir, hydrateDir, ssrDir, cacheDir } from './config.js'
import { makeLocals, renderPostHtmlPlugins, resolveAsset } from './render.js'
import { POSTHTML_OPTIONS } from './lib/posthtml.js'
import { ssr } from './lib/ssr.js'
import { hashContent } from './lib/util.js'
import { FILENAME_REWRITE_RE } from './lib/rewrites.js'

type Options = {
  staticOpts?: {
    origin?: string
  }
}
export async function buildForProduction({ staticOpts }: Options = {}) {
  console.log("Build dir:", buildDir)
  await Promise.all([
    fs.rmdir(buildDir, { recursive: true }),
    fs.rmdir(hydrateDir, { recursive: true }),
    fs.rmdir(ssrDir, { recursive: true }),
  ])
  mkdirSync(buildDir, { recursive: true })

  const buildCache = {} as Record<string,Promise<string>>

  const site = siteConfig({ scanRewrites: true })
  const origin = staticOpts?.origin || site.origin || null
  const detectedRewrites = {} as typeof site.rewrites

  if (!origin) {
    console.warn(colors.yellow(`[config] No host set`))
  }

  let filename: string

  const bundlePlugin = posthtmlPlugin({
    resolveScript: function (scriptPath: string) {
      const resolved = resolveAsset(scriptPath, filename)
      if (buildCache[resolved]) return buildCache[resolved]!

      return buildCache[resolved] = async function() {
        // esbuild code splitting is still experimental, so we're only dealing with one file
        const result = (await bundleScriptProd(resolved, buildDir, site)).outputFiles[0]!

        const publicName = path.basename(result.path.replace(buildDir, ''))
        const publicPath = path.join(path.dirname(resolved), publicName).replace(clientDir, '')
        console.log(`  + ${colors.green(resolved.replace(clientDir, ''))}\t-> ${publicPath}`)

        const dest = path.join(buildDir, publicPath)
        await fs.mkdir(path.dirname(dest), { recursive: true })
        await fs.writeFile(dest, result.contents)

        return publicPath
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
        console.log(`  + ${colors.green(resolved.replace(clientDir, ''))}\t-> ${publicPath}`)

        const dest = path.join(buildDir, publicPath)
        await fs.mkdir(path.dirname(dest), { recursive: true })

        await fs.writeFile(dest, minifiedCss)

        return publicPath
      }()
    },
  })

  for (filename of glob.sync(path.join(clientDir, '/**/*.html'))) {
    if (path.basename(filename)[0] === '_') continue
    if (filename.startsWith(staticDir)) continue

    let plainPath = filename
      .replace(clientDir, '')
      .replace('/index.html', '/')
      .replace(/\/index\.html$/, '')
      .replace(/\.html$/, '')

    if (site.rewriteOptions.removeTrailingSlashes === true && plainPath[plainPath.length - 1] === '/' && plainPath.length > 1) {
      plainPath = plainPath.slice(0, plainPath.length - 1)
    }

    // TODO: Generate multiple locales
    const ctx = {
      location: new URL(`${origin || 'http://static.example.com'}${plainPath}`),
      user: null,
      cache: {},
      locale: site.locales[0]!,
      site: site,
      plainPath,
      filename: filename,
    }
    const locals = makeLocals(ctx)
    const plugins = renderPostHtmlPlugins(ctx, locals, {
      prefix: [
        bundlePlugin
      ]
    })

    const ssrBuild = await ssr({ locals, ctx, dryRun: true })
    const clientPath = filename.replace(clientDir, '')

    if (ssrBuild) {
      console.log('\n' + colors.blue('client' + clientPath), '(SSR, no build)', '\n ├─ GET', plainPath)
    }
    else {
      if (!FILENAME_REWRITE_RE.test(clientPath)) {
        detectedRewrites[plainPath] = clientPath
      }
      console.log('\n' + colors.green('client' + clientPath), '\n ├─ GET', plainPath)
    }

    // Render no matter what to catch all scripts and styles
    const result = await posthtml(plugins).process(readFileSync(filename, 'utf8'), POSTHTML_OPTIONS)

    if (!ssrBuild) {
      const dest = path.join(buildDir, filename.replace(clientDir, ''))
      await fs.mkdir(path.dirname(dest), { recursive: true })
      await fs.writeFile(dest, result.html)
    }
  }

  if (staticOpts) {
    console.log("\nCopying client/public folder...")
    copyFolderSync(staticDir, buildDir)

    if (existsSync(filesDir)) {
      console.log("\nCopying data/files folder...")
      copyFolderSync(filesDir, path.join(buildDir, 'files'))
    }
  }
  else {
    const dest = path.join(cacheDir, 'rewrites.json')
    fs.writeFile(dest, JSON.stringify({
      ...detectedRewrites,
      ...site.rewrites,
    }))
    console.log('\n+ ' + colors.green(dest.replace(sourceDir, '')))
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
