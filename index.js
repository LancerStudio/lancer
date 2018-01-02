#!/usr/bin/env node
var program = require('commander')
var port = process.env.PORT || 8080

program
  .version(require('./package.json').version)


//
// Dev mode
//
program
  .command('dev')
  .action(function () {
    var devServer = require('express')()
    devServer.use( require('./server') )
    console.log('Starting dev server on port', port)
    devServer.listen(port)
  })

//
// Productio mode
//
program
  .command('start')
  .action(function () {
    process.env.NODE_ENV = 'production'

    var devServer = require('express')()
    devServer.use( require('./server') )
    console.log('Starting production server on port', port)
    devServer.listen(port)
  })

//
// Catch-all (invalid arguments)
//
program
  .command('*')
  .action(function(){
    exec(`lance --help`)
  })

//
// No arguments
//
if(process.argv.length === 2) {
  exec(`lance --help`)
}

//
// Begin the process
//
program.parse(process.argv)



//
// Helpers
//
function exec (cmd, args=[]) {
  return new Promise(function (resolve, reject) {
    require('child_process')
      .spawn(cmd, args, { stdio: 'inherit', shell: true })
      .on('exit', resolve)
      .on('error', reject)
  })
}
