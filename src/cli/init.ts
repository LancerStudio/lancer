import * as fs from 'fs'
import * as path from 'path'
import { green, yellow, cyan } from 'kleur'

export function initScripts(sourceDir: string) {
  const file = path.join(sourceDir, 'package.json')
  const pkg = require(file)
  pkg.scripts ||= {}
  pkg.scripts.start = 'lancer production'
  pkg.scripts.build = 'lancer build'
  pkg.scripts.init = 'lancer init'
  pkg.scripts.dev = 'lancer dev'
  fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n')
  console.log(cyan(`[update] package.json`))
}

export function initConfig(sourceDir: string) {
  write(sourceDir, path.join(sourceDir, 'site.config.js'), siteConfig)
  write(sourceDir, path.join(sourceDir, '.gitignore'), gitignore)
  write(sourceDir, path.join(sourceDir, 'README.md'), readme)
}

const siteConfig =
`
module.exports = {
  name: "My Site",
  locales: ['en'],
}
`
const readme =
`# New Lancer Project

This is a new Lancer project. Read more at [lancer.studio](https://lancer.studio)

## Getting Started

After cloning this project:

\`\`\`bash
$ npm
$ npm run init
$ npm run dev
\`\`\`
`

export function initClientDir(sourceDir: string, clientDir: string) {
  write(sourceDir, path.join(clientDir, '_layout.html'), _layoutHtml)
  write(sourceDir, path.join(clientDir, 'index.html'), indexHtml)
  write(sourceDir, path.join(clientDir, 'index.js'), indexJs)
  fs.mkdirSync(path.join(clientDir, 'styles'), { recursive: true })
  write(sourceDir, path.join(clientDir, 'styles/global.css'), globalCss)
}

const _layoutHtml =
`<!DOCTYPE html>
<title>{{ page.title }} | {{ site.name }}</title>

<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">

<meta lancer>

<link rel="stylesheet" type="text/css" href="/styles/global.css">

<yield>
`
const indexHtml =
`<page title="HOME">

<script src="/index.js"></script>

<h1>Home Page</h1>
<p>Find me in client/index.html</p>
`
const indexJs =
`console.log("Success. Find me in client/index.js")
`
const globalCss =
`body {
  background: #e9e9e9;
}
`
const gitignore =
`node_modules/
data/
`

export function initTailwind(sourceDir: string) {
  const cssFile = path.join(sourceDir, 'client/styles/global.css')
  if (fs.existsSync(cssFile)) {
    const source = fs.readFileSync(cssFile, 'utf8')
    if (!source.match(`@import "tailwindcss/base"`)) {
      fs.writeFileSync(cssFile, tailwindImports + '\n' + source)
      console.log(cyan(`[update] ${cssFile.replace(sourceDir+'/', '')}`))
    }
  }

  write(sourceDir, path.join(sourceDir, 'tailwind.config.js'), tailwindConfigJs)

  console.log(cyan('\nInstalling tailwindcss...'))
  require('child_process').spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['install', 'tailwindcss'], { stdio: [0,1,2] })
}

const tailwindConfigJs =
`module.exports = {
  mode: 'jit',
  purge: [
    './client/**/*.html',
    './client/**/*.js',
    './client/**/*.jsx',
    './client/**/*.ts',
    './client/**/*.tsx',
  ],
}
`
const tailwindImports =
`@import "tailwindcss/base";
@import "tailwindcss/components";
@import "tailwindcss/utilities";
`

function write(sourceDir: string, file: string, content: string) {
  if (!fs.existsSync(file)) {
    console.log(green(`   [new] ${file.replace(sourceDir+'/', '')}`))
    fs.writeFileSync(file, content)
  }
  else {
    console.log(yellow(`[exists] ${file.replace(sourceDir+'/', '')}`))
  }
}
