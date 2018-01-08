var fs = require('fs-extra')
var fm = require('html-frontmatter')
var Path = require('path')
var Bluebird = require('bluebird')
var Bundle = require('./bundle')
var Layouts = require('./layouts')


var styleBundles = {}
var scriptBundles = {}
var sourceDir = process.env.FREELANCE_SOURCE_DIR || `${process.cwd()}/src`
var staticDir = process.env.FREELANCE_STATIC_DIR || `${process.cwd()}/static`


var reshape = require('reshape')({
  plugins: [
    Layouts.reshapePlugin({
      root: sourceDir,
    }),
    require('reshape-include')(),
    Bundle.reshapePlugin({
      resolveScript: function (path) {
        var resolved = resolveAsset(path)
        scriptBundles[resolved] = true
        return resolved.replace(sourceDir, '')
      },
      resolveStyle: function (path) {
        var resolved = resolveAsset(path)
        styleBundles[resolved] = true
        return resolved.replace(sourceDir, '')
      },
    }),
  ]
})

var express = require('express')
var router = express.Router()
module.exports = router


router.use( express.static(staticDir) )

router.get('/*', function (req, res) {

  Bluebird.coroutine(function * () {
    var path = req.path

    try {
      var filename = resolveAsset(req.path)
      console.log('[FL Server] GET', path, '\n        -->', filename.replace(sourceDir, ''))
    }
    catch (err) {
      console.log(` >> Access denied (${path})`)
      return res.sendStatus(404)
    }

    if ( scriptBundles[filename] ) {
      var result = yield Bundle.bundleScript(filename)
      res.set({ 'Content-Type': 'application/javascript' })
      res.send(result)
    }
    else if ( styleBundles[filename] ) {
      var result = yield Bundle.bundleStyle(filename)
      res.set({ 'Content-Type': 'text/css' })
      res.send(result)
    }
    else if ( filename.match(/\.html$/) && fs.existsSync(filename) ) {
      var html = yield fs.readFile(filename, 'utf8')
      var frontMatter = fm(html)
      var result = yield reshape.process(html, { frontMatter: frontMatter })
      res.set({ 'Content-Type': 'text/html' })
      res.send(result.output())
    }
    else {
      console.log(` >> Access denied (${path})`)
      res.sendStatus(404)
    }

  })()
    .catch(function (err) {
      console.log('[FL Server] Error:\n', err)
      res.sendStatus(500)
    })

})


function resolveAsset (path) {
  var filename = Path.join(sourceDir, path)
  if ( filename[filename.length-1] === '/' ) {
    filename += 'index.html'
  }
  else if ( Path.basename(filename).indexOf('.') === -1 ) {
    filename += '.html'
  }

  if ( filename.indexOf(sourceDir) !== 0 || Path.basename(filename)[0] === '_' ) {
    throw new Error('Access denied')
  }
  return filename
}
