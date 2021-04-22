import { existsSync, promises as fs } from 'fs'
import express from 'express'

import * as Dev from './dev'
import * as Bundle from './bundle'
import { staticDir, siteConfig, env, filesDir, sourceDir, buildDir, hydrateDir } from './config'
import { resolveFile } from './files'
import { render, resolveAsset, validScriptBundles, validStyleBundles } from './render'
import { mountSession } from './lib/session'
import { ensureLocale } from './i18n'
import { guardTempPassword, requireSetup } from './dev/setup'

require('express-async-errors')


const router = express.Router()
export default router


router.use( express.static(hydrateDir) )
router.use( express.static(staticDir) )

if (!env.development) {
  router.use( express.static(buildDir) )
}

mountSession(router)
router.use( require('body-parser').json() )

Dev.mount(router)


router.get('/*', requireSetup(), ensureLocale(), async (req, res) => {
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
    const result = await Bundle.bundleScript(filename)
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
      site: siteConfig(),
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
    //
    // Only check temp passwords here
    // to avoid catching requests like favicon.io
    //
    if (guardTempPassword(req, res)) {
      return
    }
    console.log('         -->', filename.replace(sourceDir+'/', ''))
    const htmlSrc = await fs.readFile(filename, 'utf8')
    // const frontMatter = fm(html)
    // const result = await reshape.process(html, { frontMatter: frontMatter })
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
  else {
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
