#!/usr/bin/env node
require('dotenv').config()
const program = require('commander')
const port = process.env.PORT || 7272

program
  .version(require('./package.json').version)


//
// Init Project
//
const validInits = ['data', 'client', 'scripts', 'tailwind', 'all']
program
  .command('init [name]')
  .action(async function (name) {
    if (name && !validInits.includes(name)) {
      return console.log("Unknown init name:", name)
    }
    const set = {
      all: name === 'all',
      data: !name || name === 'data' || name === 'all',
      client: name === 'client' || name === 'all',
      scripts: name === 'scripts' || name === 'all',
      tailwind: name === 'tailwind',
    }

    if (set.data) {
      process.env.LANCER_INIT_DATA_DIR = '1'
    }

    const { sourceDir, clientDir, dataDir } = await import('./dist/server/config.js')

    if (set.client) {
      (await import('./dist/cli/init.js')).initClientDir(sourceDir, clientDir)
    }
    if (set.all) {
      (await import('./dist/cli/init.js')).initConfig(sourceDir)
    }
    if (set.scripts) {
      (await import('./dist/cli/init.js')).initScripts(sourceDir)
    }
    if (set.tailwind) {
      (await import('./dist/cli/init.js')).initTailwind(sourceDir)
    }

    if (set.data) {
      console.log("Initialized data directory:", dataDir)
    }
  })

//
// Dev mode
//
program
  .command('dev')
  .action(async function () {
    var devServer = (await import('express')).default()
    devServer.use( (await import('./dist/server/index.js')).default )
    console.log('Starting dev server on port', port)
    devServer.listen(port)
  })

//
// Production mode
//
program
  .command('production')
  .action(async function () {
    process.env.NODE_ENV = 'production'

    var server = (await import('express')).default()
    server.set('trust proxy', 1)
    server.use( (await import('./dist/server/index.js')).default )
    console.log('Starting production server on port', port)
    server.listen(port)
  })

//
// Build (for production)
//
program
  .command('build')
  .option('--static', 'Build a static website (experimental)')
  .option('--origin', 'Set an origin when building with --static')
  .action(async function (options) {
    const staticOpts = options.static ? { origin: options.origin || undefined } : null
    process.env.NODE_ENV = 'production'
    process.env.LANCER_BUILD = '1'

    console.log(`Building ${staticOpts ? 'static html and ' : ''}assets for production...`)

    const { buildForProduction } = await import('./dist/server/build.js')
    buildForProduction({ staticOpts }).then(
      () => {
        console.log("Done.")
      },
      err => {
        console.error(err)
        process.exit(1)
      }
    )
  })

//
// Utility
//
program
  .command('secret')
  .action(() => {
    console.log(require('crypto').randomBytes(64).toString('hex'))
  })

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
