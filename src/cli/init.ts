import * as fs from 'fs'
import * as path from 'path'

export function initScripts(sourceDir: string) {
  const file = path.join(sourceDir, 'package.json')
  const pkg = require(file)
  pkg.scripts ||= {}
  pkg.scripts.start = 'lancer production'
  pkg.scripts.build = 'lancer build'
  fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n')
}

export function initConfig(sourceDir: string) {
  fs.writeFileSync(path.join(sourceDir, 'site.config.js'), siteConfig)
}

const siteConfig =
`
module.exports = {
  name: "My Site",
  locales: ['en'],
}
`

export function initClientDir(clientDir: string) {
  fs.writeFileSync(path.join(clientDir, '_layout.html'), _layoutHtml)
  fs.writeFileSync(path.join(clientDir, 'index.html'), indexHtml)
  fs.writeFileSync(path.join(clientDir, 'index.js'), indexJs)
  fs.mkdirSync(path.join(clientDir, 'styles'), { recursive: true })
  fs.writeFileSync(path.join(clientDir, 'styles/global.css'), globalCss)
  fs.writeFileSync(path.join(clientDir, '.gitignore'), gitignore)
}

const _layoutHtml =
`<!DOCTYPE html>
<title>{{ page.title }} | {{ site.name }}</title>

<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />

<meta lancer />

<link rel="stylesheet" type="text/css" bundle="/styles/global.css" />

<yield></yield>
`

const indexHtml =
`<page layout title="HOME"></page>

<script bundle="/index.js"></script>

<h1>Home Page</h1>
<p>Find me in client/index.html</p>
`

const indexJs =
`console.log("Project init success.")
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
