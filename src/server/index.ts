import { existsSync, promises as fs } from 'fs'
import express from 'express'

import * as Dev from './dev'
import * as Bundle from './bundle'
import { staticDir, siteConfig, env, filesDir, sourceDir } from './config'
import { resolveFile } from './files'
import { render, resolveAsset, validScriptBundles, validStyleBundles } from './render'
import { checkTempPass, mountSession } from './lib/session'

require('express-async-errors')


const router = express.Router()
export default router


router.use( express.static(staticDir) )
mountSession(router)
router.use( require('body-parser').json() )

if (env.development) {
  Dev.mount(router)
}

router.get('/*', checkTempPass(), async (req, res) => {
  const path = req.path

  try {
    console.log('\n[Lancer] GET', req.url)
    var filename = resolveAsset(req.path)
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
    res.send(result)
  }
  else if ( validStyleBundles[filename] ) {
    console.log('         -->', filename.replace(sourceDir+'/', ''), '(bundle)')
    const result = await Bundle.bundleStyle(filename)
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
    console.log('         -->', filename.replace(sourceDir+'/', ''))
    const html = await fs.readFile(filename, 'utf8')
    // const frontMatter = fm(html)
    // const result = await reshape.process(html, { frontMatter: frontMatter })
    const site = siteConfig()
    const result = await render({
      site,
      cache: {},
      locale: req.params.locale || site.locales[0]
    }).process(html)
    res.set({ 'Content-Type': 'text/html' })
    res.send(result.html)
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
