import path from 'path'
import startCase from 'lodash/startCase'
import express, { Router } from "express"

import * as Bundle from '../bundle'
import { env, filesDir, siteConfig } from '../config'
import { missingFiles } from './state'
import routes from '../../shared/routes'
import { checkTempPasswordMiddleware } from './setup'
import { last } from '../../client/dev/lib/util'
import { ProcAuthError } from './errors'
import { mountDevFiles } from './files'
import { checkForInitialSetupState, requireSetup } from './setup'

export function mount(router: Router) {

  router.use('/lancer', express.static(path.join(__dirname, '../../../public')) )
  router.use(express.static(path.join(__dirname, '../../../dist/build')) )

  router.use(checkForInitialSetupState())

  if (!env.production) {
    mountLocalDevRoutes(router)
  }

  mountDevFiles(router, filesDir)

  router.post('/lancer/rpc/:method', async (req, res) => {
    const procs: any = await import('./procs')
    const methodName = req.params.method!
    const method = procs[methodName]

    const goToSignIn = () => {
      req.session.returnTo = req.get('X-Rpc-From') || '/'
      res.status(401).send({ signInUrl: '/lancer/sign-in' })
    }

    if (method && !req.user && !method.allowAnonymous && env.development) {
      goToSignIn(); return
    }
    if (!method || !req.user && !method.allowAnonymous) {
      res.status(401).send({}); return
    }
    try {
      const result = await method(req.body, { req, user: req.user })
      // console.log(`[rpc][${req.params.method}]`, result)
      res.set({ 'Content-Type': 'application/json' })
      res.status(200).send(JSON.stringify(result))
    }
    catch (err) {
      if (env.development) {
        console.log(`[rpc][${methodName}]`, err)
      }
      if (err instanceof ProcAuthError) {
        goToSignIn()
      }
      else {
        res.status(500).send(err)
      }
    }
  })

  router.post('/lancer/sign-out', (req, res) => {
    req.session.destroy(() => {
      res.redirect('/')
    })
  })

  router.get('/lancer/:page',

    requireSetup(),
    checkTempPasswordMiddleware(),

    (req, res, next) => {
      const route = routes.pages.children.find(r => r.match(req.path))
      if (!route) {
        return next()
      }
      else if (route === routes.pages.signIn && req.user) {
        return res.redirect('/')
      }

      const site = siteConfig()
      const pageName = last(route.link().split('/'))!

      res.set({ 'Content-Type': 'text/html' })
      res.send(`<!DOCTYPE html>
        <title>${startCase(pageName)} | Lancer | ${site.name}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="stylesheet" href="/lancer.css">
        <div class="bg-gray-200" id="app"></div>
        <script src="/lancer/${pageName}.js"></script>
      `)
    }
  )
}

export function handle404(path: string) {
  if (path.startsWith(filesDir)) {
    const p = path.replace(filesDir, '/files')
    missingFiles[p] = missingFiles[p] || 0
    missingFiles[p] += 1
  }
}

function mountLocalDevRoutes(router: Router) {
  router.get('/lancer.js', async (_req, res) => {
    const result = await Bundle.bundleScript(path.join(__dirname, '../../../src/client/dev/index.tsx'))
    res.set({ 'Content-Type': 'application/javascript' })
    res.send( Buffer.from(result.buffer).toString('utf8') )
  })

  router.get('/lancer/:page.js', async (req, res) => {
    const route = routes.pages.children.find(r => r.match(req.path.replace(/.js$/, '')))
    if (!route) {
      res.sendStatus(404); return
    }

    const pageName = last(route.link().split('/'))!

    const result = await Bundle.bundleScript(path.join(__dirname, `../../../src/client/pages/${pageName}/index.tsx`))
    res.set({ 'Content-Type': 'application/javascript' })
    res.send( Buffer.from(result) )
  })
}
