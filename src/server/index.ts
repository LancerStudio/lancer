import 'dotenv/config'

import { existsSync, promises as fs } from 'fs'
import path from 'path'
import express from 'express'

import * as Dev from './dev'
import * as Bundle from './bundle'
import { staticDir, siteConfig, env, filesDir, sourceDir, buildDir, hydrateDir, clientDir } from './config'
import { resolveFile } from './files'
import { render, resolveAsset, validScriptBundles, validStyleBundles } from './render'
import { mountSession } from './lib/session'
import { ensureLocale } from './i18n'
import { guardTempPassword, requireSetup } from './dev/setup'
import { buildSsrFile, ssrBuildFile } from './lib/ssr'
import { requireLatestOptional } from './lib/fs'

require('express-async-errors')


const router = express.Router()
export default router


router.use( express.static(hydrateDir) )
router.use( express.static(staticDir) )

if (!env.development) {
  router.use( express.static(buildDir) )
}

if (siteConfig().studio) {
  mountSession(router)
}

router.use( require('body-parser').json() )

if (siteConfig().studio) {
  Dev.mount(router)
}

router.post('/lrpc', async (req, res) => {
  const ns = req.body.namespace
  if (!ns.match(/\.server$/)) return res.sendStatus(404)

  if (env.development) {
    // Warning: Some logic duplicated from ssr.ts
    let ssrFile = path.join(clientDir, `${ns}.js`)
    if (!existsSync(ssrFile)) ssrFile = path.join(clientDir, `${ns}.ts`)
    if (!existsSync(ssrFile)) {
      console.error('No such js/ts file:', `client/${ns}`)
      return res.sendStatus(404)
    }

    await buildSsrFile(ssrFile)
  }

  const rpcs = requireLatestOptional(ssrBuildFile(`${ns}.js`))
  const rpc = rpcs && rpcs.module[req.body.method]
  if (!rpc) return res.sendStatus(404)

  const result = await rpc(...req.body.args)
  return res.send(result)
})

router.get('/*', requireSetup(), ensureLocale(), async (req, res) => {
  const site = siteConfig()
  const path = req.locale ? req.path.replace(`/${req.locale}`, '') : req.path

  try {
    console.log('\n[Lancer] GET', req.url)
    var filename = resolveAsset(path)
  }
  catch (err) {
    console.log('         -->', err.message)
    res.sendStatus(404)
    return
  }

  if ( validScriptBundles[filename] ) {
    console.log('         -->', filename.replace(sourceDir+'/', ''), '(bundle)')
    const result = await Bundle.bundleScript(filename, site)
    res.set({ 'Content-Type': 'application/javascript' })
    res.send(Buffer.from(result).toString('utf8'))
  }
  else if ( validStyleBundles[filename] ) {
    console.log('         -->', filename.replace(sourceDir+'/', ''), '(bundle)')
    const result = await Bundle.bundleStyle(sourceDir, filename)
    res.set({ 'Content-Type': 'text/css' })
    res.send(result === null ? '!error' : result)
  }
  else if ( filename.startsWith(filesDir) ) {
    const file = await resolveFile(filename, {
      site,
      preview: queryStringVal('preview')
    })
    if (file) {
      console.log('         -->', file.replace(sourceDir+'/', ''))
      res.sendFile(file)
    }
    else {
      res.sendStatus(404)
    }
  }
  else if ( filename.match(/\.html$/) && existsSync(filename) ) {
    await renderHtml(filename)
  }
  else if ( filename.match(/\.html$/) ) {
    const folderIndex = filename.replace(/\.html$/, '/index.html')
    if (existsSync(folderIndex)) {
      await renderHtml(folderIndex)
    }
    else notFound()
  }
  else {
    notFound()
  }

  async function renderHtml(filename: string) {
    //
    // Only check temp passwords here
    // to avoid catching requests like favicon.io
    //
    if (guardTempPassword(req, res)) {
      return
    }
    console.log('         -->', filename.replace(sourceDir+'/', ''))
    const htmlSrc = await fs.readFile(filename, 'utf8')
    const site = siteConfig()
    const html = await render(htmlSrc, {
      site,
      user: req.user,
      cache: {},
      locale: req.locale || site.locales[0]!,
      reqPath: path,
      filename,
    })
    res.set({ 'Content-Type': 'text/html' })
    res.send(html)
  }

  function notFound() {
    if (existsSync(filename)) {
      console.log(' >> Access denied', path)
    }
    else {
      console.log(' >> No such file', path)
    }
    res.sendStatus(404)

    if (env.development) {
      Dev.handle404(filename)
    }
  }

  function queryStringVal(key: string): string | undefined {
    let val = req.query[key]
    return typeof val === 'string' ? val : undefined
  }
})
