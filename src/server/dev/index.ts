// import glob from 'glob'
import path from 'path'
import startCase from 'lodash/startCase'
import express, { Router } from "express"

import * as Bundle from '../bundle'
import { env, filesDir } from '../config'
import { missingFiles } from './state'
import routes from '../../shared/routes'
import { requireUser, checkTempPassword } from '../lib/session'
import { last } from '../../client/dev/lib/util'
import { ProcAuthError } from './errors'


export function mount(router: Router) {

  router.use('/lancer', express.static(path.join(__dirname, '../../../public')) )

  router.get('/lancer.js', async (req, res) => {
    if (!req.user) {
      res.send('//'); return
    }
    const result = await Bundle.bundleScript(path.join(__dirname, '../../client/dev'))
    res.set({ 'Content-Type': 'application/javascript' })
    res.send(result)
  })

  router.get('/lancer/:page.js', async (req, res) => {
    const route = routes.pages.children.find(r => r.match(req.path.replace(/.js$/, '')))
    if (!route || !req.user && route !== routes.pages.signIn) {
      res.sendStatus(404); return
    }

    const pageName = last(route.link().split('/'))!

    const result = await Bundle.bundleScript(path.join(__dirname, `../../client/pages/${pageName}/index`))
    res.set({ 'Content-Type': 'application/javascript' })
    res.send(result)
  })

  router.get('/lancer.css', async (req, res) => {
    res.sendFile( path.join(__dirname, `../../client/dev/${ req.query.unscoped ? 'style' : 'style-scoped' }.css`) )
  })

  router.post('/lancer/rpc/:method', async (req, res) => {
    const procs: any = await import('./procs')
    const method = procs[req.params.method!]
    if (!method) {
      res.status(404).send({})
      return
    }
    try {
      const result = await method(req.body, { req })
      // console.log(`[rpc][${req.params.method}]`, result)
      res.set({ 'Content-Type': 'application/json' })
      res.status(200).send(JSON.stringify(result))
    }
    catch (err) {
      if (env.development) {
        console.log(`[rpc][${method}]`, err)
      }
      if (err instanceof ProcAuthError) {
        res.sendStatus(401)
      }
      else {
        res.status(500).send(err)
      }
    }
  })

  router.get('/lancer/:page', requireUser({ redirectIfNot: true }), checkTempPassword(), (req, res, next) => {
    const route = routes.pages.children.find(r => r.match(req.path))
    if (!route) {
      return next()
    }
    else if (route === routes.pages.signIn && req.user) {
      return res.redirect('/')
    }

    const pageName = last(route.link().split('/'))!

    res.set({ 'Content-Type': 'text/html' })
    res.send(`<!DOCTYPE html>
      <title>${startCase(pageName)} | Lancer | {{ site.name }}</title>
      <link rel="stylesheet" href="/lancer.css?unscoped=1">
      <div class="bg-gray-200" id="app"></div>
      <script src="/lancer/${pageName}.js"></script>
    `)
  })
}

export function handle404(path: string) {
  if (path.startsWith(filesDir)) {
    const p = path.replace(filesDir, '/files')
    missingFiles[p] = missingFiles[p] || 0
    missingFiles[p] += 1
  }
}
