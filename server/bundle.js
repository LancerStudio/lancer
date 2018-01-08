var fs = require('fs-extra')
var Bluebird = require('bluebird')
var isProd = process.env.NODE_ENV === 'production'

//
// <script> and <link> tag rewriting
//
var modifyNodes = require('reshape-plugin-util').modifyNodes

exports.reshapePlugin = function (options) {
  options || (options = {})

  var resolveStyle = options.resolveStyle || identity
  var resolveScript = options.resolveScript || identity

  return function bundle (ast) {
    // console.log("Bundling", ast)
    return modifyNodes(ast, isMatch, function (node) {
      var type = node.name
      var bundle = node.attrs && node.attrs.bundle && node.attrs.bundle[0]

      if ( (type === 'script' || type === 'link') && bundle ) {
        delete node.attrs.bundle

        if ( ! bundle.content ) {
          console.log('[bundle] ERROR: Invalid '+type+' bundle attribute:', bundle)
        }
        else {
          try {
            var resolve = (type === 'script') ? resolveScript : resolveStyle
            var resolveAttr = (type === 'script') ? 'src' : 'href'
            node.attrs[resolveAttr] = {
              type: 'text',
              content: resolve(bundle.content),
            }
          }
          catch (err) {
            console.log('[bundle] WARNING: Could not resolve '+type+'} path:', bundle.content)
          }
        }
      }

      return node
    })
  }
}

function isMatch (node) {
  return node.name === 'script' || node.name === 'link'
}

function identity (x) { return x }


//
// Script bundling
//
var browserify = require('browserify')

exports.bundleScript = function (file) {
  return new Promise(function (resolve, reject) {
    browserify(file).bundle(function (err, src) {
      if (err) return reject(err)
      resolve(src)
    })
  })
}


//
// Style bundling
//
var postcss = require('postcss')([
  require("postcss-import")(),
  require('postcss-cssnext')
])

exports.bundleStyle = function (file) {
  return fs.readFile(file, 'utf8')
    .then(function (css) {
      return postcss.process(css, {
        from: file,
        to: file,
        map: { inline: ! isProd },
      })
    })
    .then(function (result) {
      return result.css
    })
    .catch(function (error) {
      if ( error.name === 'CssSyntaxError' ) {
        process.stderr.write(error.message + error.showSourceCode())
      } else {
        throw error
      }
    })
}
