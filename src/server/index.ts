import { existsSync, promises as fs } from 'fs'
import path from 'path'
import express from 'express'

import * as Dev from './dev'
import * as Bundle from './bundle'
import * as i18n from './i18n'
import IncludePlugin from './posthtml-plugins/include'
import { clientDir, staticDir, site, env, filesDir, PostHtmlCtx } from './config'
import { Translation } from './models'

require('express-async-errors')
// var fm = require('html-frontmatter')
// var Layouts = require('./layouts')

const styleBundles: Record<string, boolean> = {}
const scriptBundles: Record<string, boolean> = {}

const posthtml = (ctx: PostHtmlCtx) => require('posthtml')([
  Bundle.posthtmlPlugin({
    resolveScript: function (scriptPath: string) {
      var resolved = resolveAsset(scriptPath)
      scriptBundles[resolved] = true
      return resolved.replace(clientDir, '')
    },
    resolveStyle: function (stylePath: string) {
      var resolved = resolveAsset(stylePath)
      styleBundles[resolved] = true
      return resolved.replace(clientDir, '')
    },
  }),

  IncludePlugin({ root: clientDir, encoding: 'utf8' }),

  require('posthtml-expressions')({
    scopeTags: ['context'],
    locals: { site }
  }),

  i18n.posthtmlPlugin({ Translation, ctx, site }),
])

const router = express.Router()
export default router


router.use( express.static(staticDir) )
router.use( require('body-parser').json() )

if (env.development) {
  Dev.mount(router)
}

router.get('/*', async (req, res) => {
  const path = req.path

  try {
    console.log('[Lancer] GET', path)
    var filename = resolveAsset(req.path)
    console.log('         -->', req.path)
  }
  catch (err) {
    console.log('         -->', err.message)
    res.sendStatus(404)
    return
  }

  if ( scriptBundles[filename] ) {
    const result = await Bundle.bundleScript(filename)
    res.set({ 'Content-Type': 'application/javascript' })
    res.send(result)
  }
  else if ( styleBundles[filename] ) {
    const result = await Bundle.bundleStyle(filename)
    res.set({ 'Content-Type': 'text/css' })
    res.send(result === null ? '!error' : result)
  }
  else if ( filename.startsWith(filesDir) ) {
    res.sendFile(filename)
  }
  else if ( filename.match(/\.html$/) && existsSync(filename) ) {
    const html = await fs.readFile(filename, 'utf8')
    // const frontMatter = fm(html)
    // const result = await reshape.process(html, { frontMatter: frontMatter })
    const result = await posthtml({ locale: req.params.locale || site.locales[0] }).process(html)
    res.set({ 'Content-Type': 'text/html' })
    res.send(result.html)
  }
  else {
    if (existsSync(filename)) {
      console.log(' >> Access denied', path)
    }
    else {
      console.log(' >> No such file', path)
    }
    res.sendStatus(404)

    if (env.development) {
      Dev.handle404(filename)
    }
  }
})


function resolveAsset (assetPath: string) {
  var filename = assetPath.startsWith('/files/')
    ? path.join(filesDir, assetPath.replace('/files/', ''))
    : path.join(clientDir, assetPath)

  if ( filename[filename.length-1] === '/' ) {
    filename += 'index.html'
  }
  else if ( path.basename(filename).indexOf('.') === -1 ) {
    filename += '.html'
  }

  if ( !filename.startsWith(filesDir) && !filename.startsWith(clientDir) ) {
    throw new Error('Access denied')
  }
  if ( path.basename(filename)[0] === '_' ) {
    throw new Error('Access denied (partial)')
  }
  return filename
}
