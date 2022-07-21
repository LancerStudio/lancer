import glob from 'glob'
import path from 'path'
import posthtml from 'posthtml'
import { readFileSync, promises as fs, mkdirSync, readdirSync, copyFileSync, lstatSync, existsSync } from 'fs'
import { buildSync } from 'esbuild'
import colors from 'kleur'

import { bundleScriptProd, bundleStyle, buildSsrFile } from './bundle.js'
import { clientDir, siteConfig, buildDir, sourceDir, staticDir, filesDir, hydrateDir, ssrDir, cacheDir } from './config.js'
import { makeLocals, renderPostHtmlPlugins } from './render.js'
import { POSTHTML_OPTIONS } from './lib/posthtml.js'
import { ssr } from './lib/ssr.js'
import { hashContent } from './lib/util.js'
import { FILENAME_REWRITE_RE } from './lib/rewrites.js'
import { getPageAttrs } from './lib/fs.js'
import { buildUniversalScript } from './posthtml-plugins/include.js'
import { ReplaceAssetPathsPlugin } from './posthtml-plugins/assets.js'
import { ReplaceRootPathsPlugin } from './posthtml-plugins/root-path.js'

type Options = {
  origin?: string
}
export async function buildForProduction(options: Options = {}) {
  const site = siteConfig({ scanRewrites: true })

  console.log(`Building ${site.static ? 'static html and ' : ''}assets for production...`)

  console.log("Build dir:", buildDir)
  await Promise.all([
    fs.rm(buildDir, { recursive: true, force: true }),
    fs.rm(hydrateDir, { recursive: true, force: true }),
    fs.rm(ssrDir, { recursive: true, force: true }),
  ])
  await Promise.all([
    mkdirSync(buildDir, { recursive: true }),
    mkdirSync(hydrateDir, { recursive: true }),
    mkdirSync(ssrDir, { recursive: true }),
  ])

  const publicAssetPaths = {} as Record<string,string>

  const origin = options.origin || site.origin || null
  const detectedRewrites = {} as typeof site.rewrites

  if (!origin) {
    console.warn(colors.yellow(`[config] No host set`))
  }

  //
  // Universal JS files
  //
  const universalJsFiles = glob.sync(path.join(clientDir, '/**/*.universal.{js,jsx,ts,tsx}'))

  for (let [i, filename] of universalJsFiles.entries()) {
    if (i === 0) {
      console.log('\nBundling', colors.cyan('Universal JavaScript'), 'Files')
    }
    const result = await buildUniversalScript(filename)
    console.log('  + ' + colors.green(result.ssrFile.replace(sourceDir, '')))
    console.log('  + ' + colors.green(result.hydrateFile.replace(sourceDir, '')))
    publicAssetPaths[filename] = result.hydrateFile.replace(hydrateDir, '')
  }

  //
  // Client JS files
  //
  const clientJsFiles = glob.sync(path.join(clientDir, '/**/*.{js,jsx,ts,tsx}'))
    .filter(f => !f.replace(clientDir, '').includes('/_'))
    .filter(f => !f.replace(clientDir, '').match(/\.server\.(js|ts)x?$/))

  for (let [i, filename] of clientJsFiles.entries()) {
    if (i === 0) {
      console.log('\nBundling', colors.yellow('Client JavaScript'), 'Files')
    }
    const result = (await bundleScriptProd(filename, buildDir, site)).outputFiles[0]!

    const publicName = path.basename(result.path.replace(buildDir, ''))
    const publicPath = path.join(path.dirname(filename), publicName).replace(clientDir, '')
    console.log(`  + ${colors.green(filename.replace(clientDir, ''))}\t-> ${publicPath}`)

    const dest = path.join(buildDir, publicPath)
    await fs.mkdir(path.dirname(dest), { recursive: true })
    await fs.writeFile(dest, result.contents)
    publicAssetPaths[filename] = publicPath
  }

  //
  // CSS files
  //
  const cssFiles = glob.sync(path.join(clientDir, '/**/*.css'))
    .filter(f => !f.replace(clientDir, '').includes('/_'))

  for (let [i, filename] of cssFiles.entries()) {
    if (i === 0) {
      console.log('\nBundling', colors.magenta('CSS'), 'Files')
    }
    const css = await bundleStyle(sourceDir, filename)
    if (!css) {
      throw new Error(`Failed to compile ${filename}`)
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
      path.dirname(filename.replace(clientDir, '')),
      path.basename(filename).replace('.css', `-${hashContent(minifiedCss)}.css`)
    )
    console.log(`  + ${colors.green(filename.replace(clientDir, ''))}\t-> ${publicPath}`)

    const dest = path.join(buildDir, publicPath)
    await fs.mkdir(path.dirname(dest), { recursive: true })

    await fs.writeFile(dest, minifiedCss)

    publicAssetPaths[filename] = publicPath
  }


  //
  // HTML files
  //
  const builtServerFiles: POJO<boolean> = {}
  const htmlFiles = glob.sync(path.join(clientDir, '/**/*.html'))
    .filter(f => !f.replace(clientDir, '').includes('/_'))

  for (let filename of htmlFiles) {
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

    const ssrResult = await ssr({ locals, ctx, dryRun: true })
    const clientPath = filename.replace(clientDir, '')

    if (ssrResult.buildFile) {
      builtServerFiles[ssrResult.ssrFile] = true
    }

    if (ssrResult.isSsr) {
      // TODO: Compile IHTML into optimized JS code
      console.log('\n' + colors.blue('client' + clientPath), '(SSR; no build)', '\n ├─ GET', plainPath)
    }
    else {
      if (!FILENAME_REWRITE_RE.test(clientPath)) {
        detectedRewrites[plainPath] = clientPath
      }
      console.log('\n' + colors.green('client' + clientPath), '\n ├─ GET', plainPath)
      const plugins = renderPostHtmlPlugins(ctx, locals, {
        postfix: [
          ReplaceAssetPathsPlugin({ publicAssetPaths, file: filename }),
          ReplaceRootPathsPlugin({ rootPath: site.rootPath })
        ]
      })
      const pageAttrs = getPageAttrs(filename)
      const result = await posthtml(plugins).process(readFileSync(filename, 'utf8'), POSTHTML_OPTIONS)

      if (site.static || pageAttrs?.static) {
        const dest = path.join(buildDir, filename.replace(clientDir, ''))
        await fs.mkdir(path.dirname(dest), { recursive: true })

        let finalHtml = result.html
        if (pageAttrs?.passwordencrypt) {
          let passwordKey = pageAttrs?.passwordencrypt
          if (!passwordKey || passwordKey === true) {
            throw new Error(`[lancer] Please set a value for passwordEncrypt`)
          }
          if (!passwordKey.startsWith('env:PAGE_PASS')) {
            throw new Error(`[lancer] passwordEncrypt must begin with 'env:PAGE_PASS' (found '${passwordKey}')`)
          }

          const envKey = passwordKey.replace(/^env:/, '')
          if (!process.env[envKey]) {
            throw new Error(`[lancer] Please set the '${envKey}' environment variable for passwordEncrypt`)
          }

          const password = process.env[envKey]
          try {
            const { encryptHTML } = await import(path.join(sourceDir, 'node_modules/pagecrypt/core.js'))
            finalHtml = await encryptHTML(finalHtml, password)
          }
          catch(err) {
            if (/Cannot find module/.test(err.message)) {
              throw new Error(`Please \`npm install pagecrypt\` to use the password encrypt feature.`)
            }
            else throw err
          }
        }

        await fs.writeFile(dest, finalHtml)
      }
    }
  }

  if (site.static) {
    if (existsSync(staticDir)) {
      console.log("\nCopying client/public folder...")
      copyFolderSync(staticDir, buildDir)
    }

    if (existsSync(filesDir)) {
      console.log("\nCopying data/files folder...")
      copyFolderSync(filesDir, path.join(buildDir, 'files'))
    }
  }
  else {

    //
    // Server Side Endpoints
    //
    const endpointFiles = glob.sync(path.join(clientDir, '/**/*.server.{js,ts}'))
      .filter(f => !f.replace(clientDir, '').includes('/_'))
      .filter(f => !builtServerFiles[f])

    for (let [i, ssrFile] of endpointFiles.entries()) {
      if (i === 0) {
        console.log('\nBuilding', colors.blue('Server Endpoint'), 'Files')
      }
      await buildSsrFile(ssrFile, site)
      console.log('  + ' + colors.green(ssrFile.replace(sourceDir, '')))
    }

    const rewritesDest = path.join(cacheDir, 'rewrites.json')
    fs.writeFile(rewritesDest, JSON.stringify({
      ...detectedRewrites,
      ...site.rewrites,
    }))
    console.log('\n+ ' + colors.green(rewritesDest.replace(sourceDir, '')))

    const publicAssetPathsDest = path.join(cacheDir, 'public-asset-paths.json')
    fs.writeFile(publicAssetPathsDest, JSON.stringify(publicAssetPaths))
    console.log('\n+ ' + colors.green(publicAssetPathsDest.replace(sourceDir, '')))
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
