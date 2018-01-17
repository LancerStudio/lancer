
module.exports = function configurePlugins (sourceDir, router) {
  var config
  try {
    config = require(sourceDir + '/backend.js')
  }
  catch (err) {
    config = {}
  }

  for (var pluginName in config.plugins) {
    var pluginConfig = config.plugins[pluginName]
    var plugin = require('./plugins/' + pluginName)
    plugin(pluginConfig, router)
  }
}
