import { promises as fs} from 'fs'
import path from 'path'

const srcDir = path.join(__dirname, '../../src')
const distDir = path.join(srcDir, '../dist')

var postcss = require('postcss')([
  require("postcss-import")(),
  require('tailwindcss')( path.join(srcDir, 'client/tailwind.config.js') ),
  require('postcss-prefix-selector')({
    prefix: '.Lancer',
    exclude: [/data-t-/]
  })
])

async function build() {
  const file = path.join(srcDir, 'client/dev/styles/index.css')
  const css = await fs.readFile(file, 'utf8')
  const result = await postcss.process(css, {
    from: file,
    to: file,
    map: { inline: true },
  })
  await fs.writeFile(path.join(distDir, 'client/dev/style.css'), result.css)
}

build()
