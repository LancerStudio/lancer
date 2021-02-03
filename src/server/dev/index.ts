import path from 'path'
import { Router } from "express"

import * as Bundle from '../bundle'
import { filesDir } from '../config'
import { missingFiles } from './state'


export function mount(router: Router) {

  router.get('/lancer/dev.js', async (_req, res) => {
    const result = await Bundle.bundleScript(path.join(__dirname, '../../client/dev'))
    res.set({ 'Content-Type': 'application/javascript' })
    res.send(result)
  })  

  router.get('/lancer/dev.css', async (_req, res) => {
    res.sendFile( path.join(__dirname, '../../client/dev/style.css') )
  })  

  router.post('/lancer/rpc/:method', async (req, res) => {
    const procs: any = await import('./procs')
    const method = procs[req.params.method!]
    if (!method) {
      res.status(404).send({})
      return
    }
    try {
      const result = await method(req.body)
      // console.log(`[rpc][${method}]`, result)
      res.send(result)
    }
    catch (err) {
      // console.log(`[rpc][${method}]`, err)
      res.status(500).send(err)
    }
  })
}

export function handle404(path: string) {
  if (path.startsWith(filesDir)) {
    const p = path.replace(filesDir, '/files')
    missingFiles[p] = missingFiles[p] || 0
    missingFiles[p] += 1
  }
}
