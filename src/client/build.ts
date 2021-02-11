import postcss from 'postcss'
import path from 'path'
import { promises as fs} from 'fs'

const srcDir = path.join(__dirname, '../../src')
const distDir = path.join(srcDir, '../dist')

const plugins = [
  require("postcss-import")(),
  require('tailwindcss')( path.join(srcDir, 'client/tailwind.config.js') ),
]

const pluginsScoped = plugins.concat([
  require('postcss-prefix-selector')({
    prefix: '.Lancer',
    exclude: [/data-t-/]
  })
])


async function build() {
  console.log(`Building Lancer CSS (${process.env.NODE_ENV || 'development'})`)
  const file = path.join(srcDir, 'client/dev/styles/index.css')
  const css = await fs.readFile(file, 'utf8')
  const result = await postcss(plugins).process(css, {
    from: file,
    to: file,
    map: { inline: true },
  })
  await fs.writeFile(path.join(distDir, 'client/dev/style.css'), result.css)

  const scoped = await postcss(pluginsScoped).process(css, {
    from: file,
    to: file,
    map: { inline: true },
  })
  await fs.writeFile(path.join(distDir, 'client/dev/style-scoped.css'), scoped.css)
}

build()
