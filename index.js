#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const program = require('commander')
const port = process.env.PORT || 8080
const { question } = require('readline')

program
  .version(require('./package.json').version)


//
// Init Project
//
program
  .command('init [name]')
  .action(function (name) {
    if (name && name !== 'data' && name !== 'client') {
      return console.log("Unknown init name:", name)
    }
    const set = {
      data: !name || name === 'data',
      client: !name || name === 'client',
    }

    if (set.data) {
      process.env.LANCER_INIT_DATA_DIR = '1'
    }

    const { clientDir, dataDir } = require('./dist/server/config')
    if (set.data) {
      console.log("Initialized data directory:", dataDir)
    }
    if (set.client) {
      console.log("Initialized client directory:", clientDir)
    }
  })

//
// Dev mode
//
program
  .command('dev')
  .action(function () {
    var devServer = require('express')()
    devServer.use( require('./dist/server').default )
    console.log('Starting dev server on port', port)
    devServer.listen(port)
  })

//
// Production mode
//
program
  .command('production')
  .action(function () {
    process.env.NODE_ENV = 'production'

    var server = require('express')()
    server.set('trust proxy', 1)
    server.use( require('./dist/server').default )
    console.log('Starting production server on port', port)
    server.listen(port)
  })

//
// User Management
//
program
  .command('users:create <type> <email>')
  .option('-p, --password <password>', 'A temporary password')
  .option('-n, --name <name>', 'The name of the user')
  .action((type, email, options) => {
    if (type !== 'client' && type !== 'dev') {
      throw new Error(`Invalid type: '${type}' (must be 'client' or 'dev')`)
    }
    if (!email.match(/.+@.+/)) {
      throw new Error(`Invalid email: '${email}'`)
    }
    const password = options.password || new Array(10).fill(0).map(n => alpha[Math.floor(Math.random() * alpha.length)]).join('')
    const name = options.name || capitalize(email.split('@')[0])
    const { User } = require('./dist/server/models')

    User.create(email, password, { name, type, password_temporary: 1 })
    console.log(`User ${email} created.`)

    if (!options.password) {
      console.log("Temporary password:", password)
    }
  })

const alpha = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ123456789'
const capitalize = (s) => s[0].toUpperCase() + s.slice(1)

//
// Utility
//
program
  .command('secret')
  .action(() => {
    console.log(require('crypto').randomBytes(64).toString('hex'))
  })

//
// Catch-all (invalid arguments)
//
program
  .command('*')
  .action(function(){
    exec('lancer --help')
  })

//
// No arguments
//
if(process.argv.length === 2) {
  exec('lancer --help')
}

//
// Begin the process
//
async function go() {
  try {
    await program.parseAsync(process.argv)
  }
  catch(err) {
    console.error(err)
    process.exit(1)
  }
}
go()



//
// Helpers
//
function exec(cmd, args=[]) {
  return new Promise((resolve, reject) => {
    require('child_process')
      .spawn(cmd, args, { stdio: 'inherit', shell: true })
      .on('exit', resolve)
      .on('error', reject)
  })
}
