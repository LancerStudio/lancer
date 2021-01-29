import { existsSync, promises as fs } from 'fs'
import Path from 'path'
import express from 'express'

import * as Bundle from './bundle'
import IncludePlugin from './posthtml-plugins/include'
import { clientDir, staticDir, site } from './config'
// var fm = require('html-frontmatter')
// var Layouts = require('./layouts')


var styleBundles: Record<string, boolean> = {}
var scriptBundles: Record<string, boolean> = {}

var posthtml = require('posthtml')([
  Bundle.posthtmlPlugin({
    resolveScript: function (path: string) {
      var resolved = resolveAsset(path)
      scriptBundles[resolved] = true
      return resolved.replace(clientDir, '')
    },
    resolveStyle: function (path: string) {
      var resolved = resolveAsset(path)
      styleBundles[resolved] = true
      return resolved.replace(clientDir, '')
    },
  }),

  IncludePlugin({ root: clientDir, encoding: 'utf8' }),
])

const router = express.Router()
export default router


router.use( express.static(staticDir) )

router.get('/*', function (req, res) {

  (async function () {
    const path = req.path

    try {
      console.log('[Lance] GET', path)
      var filename = resolveAsset(req.path)
      console.log('        -->', req.path)
    }
    catch (err) {
      console.log('        -->', err.message)
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
    else if ( filename.match(/\.html$/) && existsSync(filename) ) {
      const html = await fs.readFile(filename, 'utf8')
      // const frontMatter = fm(html)
      // const result = await reshape.process(html, { frontMatter: frontMatter })
      const result = await posthtml.process(html)
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
    }

  })()
    .catch(function (err) {
      console.log('[Lance] Error:\n', err)
      res.sendStatus(500)
    })
})


function resolveAsset (path: string) {
  var filename = Path.join(clientDir, path)
  if ( filename[filename.length-1] === '/' ) {
    filename += 'index.html'
  }
  else if ( Path.basename(filename).indexOf('.') === -1 ) {
    filename += '.html'
  }

  if ( filename.indexOf(clientDir) !== 0 || Path.basename(filename)[0] === '_' ) {
    throw new Error('Access denied (partial)')
  }
  return filename
}
