import postcss from 'postcss'
import path from 'path'
import { existsSync, promises as fs} from 'fs'
import { bundleScript } from '../server/bundle.js'
import routes from '../shared/routes.js'
import { siteConfig } from '../server/config.js'

import postcssImport from 'postcss-import'
import postcssPrefixSelector from 'postcss-prefix-selector'
import tailwind from 'tailwindcss'
import autoprefixer from 'autoprefixer'

const __dirname = new URL('.', import.meta.url).pathname
const srcDir = path.join(__dirname, '../../src')
const distDir = path.join(__dirname, '../../dist')
const buildDir = path.join(distDir, 'build')

const common = [
  postcssImport(),
  tailwind( path.join(srcDir, 'client/tailwind.config.cjs') ),
]

const plugins = [
  ...common,
  autoprefixer(),
]

const pluginsScoped = [
  ...common,
  postcssPrefixSelector({
    prefix: '.Lancer',
    exclude: [/data-t-/, /^.Lancer/]
  }),
  autoprefixer(),
]


async function build() {
  await fs.rm(buildDir, { recursive: true, force: true })
  await fs.mkdir(buildDir, { recursive: true })

  const scope = process.argv[process.argv.length-1]
  if (scope !== 'assets' && scope !== 'css' && scope !== 'js') {
    throw new Error(`Invalid scope: '${scope}'`)
  }

  console.log(`Building Lancer ${scope} (${process.env.NODE_ENV || 'development'})`)
  console.log(' ', buildDir.replace(process.cwd()+'/', ''))

  if (scope === 'css' || scope === 'assets') {
    console.log('  > lancer.css ...')
    const file = path.join(srcDir, 'client/dev/styles/index.css')
    const css = await fs.readFile(file, 'utf8')
    const result = await postcss(plugins).process(css, {
      from: file,
      to: file,
      map: { inline: true },
    })
    await fs.writeFile(path.join(buildDir, 'lancer.css'), result.css)

    console.log('  > lancer-scoped.css ...')
    const scoped = await postcss(pluginsScoped).process(css, {
      from: file,
      to: file,
      map: { inline: true },
    })
    await fs.writeFile(path.join(buildDir, 'lancer-scoped.css'), scoped.css)
  }

  if (scope === 'js' || scope === 'assets') {
    console.log('  > lancer.js ...')
    const site = await siteConfig()
    const lancerJs = await bundleScript(path.join(srcDir, 'client/dev/website-editor.ts'), site)
    await fs.writeFile(path.join(buildDir, 'lancer.js'), lancerJs)

    await Promise.all(
      routes.pages.children.map(async route => {
        const page = route.link().replace('/lancer/', '')
        const file = path.join(srcDir, 'client/pages', page, 'index.ts')
        if (!existsSync(file)) return

        // Match dest to /lancer/:page.js route
        const dest = path.join(buildDir, 'lancer', `${page}.js`)

        console.log(`  > ${dest.replace(buildDir+'/', '')} ...`)

        const js = await bundleScript(file, site)
        await fs.mkdir(path.dirname(dest), { recursive: true })
        await fs.writeFile(dest, js)
      })
    )
  }
}

build()
