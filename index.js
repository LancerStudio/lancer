#!/usr/bin/env node
var program = require('commander')

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
    console.log('Starting dev server on port 8080')
    devServer.listen(process.env.PORT || 8080)
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
