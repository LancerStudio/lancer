
//
// <script> and <link> tag rewriting
//
var modifyNodes = require('reshape-plugin-util').modifyNodes

exports.reshapePlugin = function (options) {
  options || (options = {})

  var resolveLink = options.resolveLink || noop
  var resolveScript = options.resolveScript || noop

  return function bundle (ast) {
    // console.log("Bundling", ast)
    return modifyNodes(ast, isMatch, function (node) {
      console.log("Found a cool node", JSON.stringify(node))
      var type = node.name
      var bundle = node.attrs && node.attrs.bundle && node.attrs.bundle[0]

      if ( type === 'script' || type === 'link' ) {
        delete node.attrs.bundle

        if ( ! bundle.content ) {
          console.log(`[bundle] ERROR: Invalid ${type} bundle attribute:`, bundle)
        }
        else {
          try {
            var resolve = type === 'script' ? resolveScript : resolveLink
            var resolveAttr = type === 'script' ? 'src' : 'href'
            node.attrs[resolveAttr] = {
              type: 'text',
              content: resolveScript(bundle.content),
            }
          }
          catch (err) {
            console.log(`[bundle] WARNING: Could not resolve ${type} path:`, bundle.content)
          }
        }
      }

      console.log("Returning node", node)
      return node
    })
  }
}

function isMatch (node) {
  return node.name === 'script' || node.name === 'link'
}

function noop () {}


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
