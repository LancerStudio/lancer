import os from 'os'
import path from 'path'
import fetch from 'node-fetch'
import FormData from 'form-data'
import { createReadStream, existsSync } from 'fs'
import { createArchive } from '../server/dev/files'
import { filesDir } from '../server/config'


export async function pushFiles(host: string, opts: { inputDir?: string }) {
  host = host.startsWith('http') ? host : `https://${host}`
  const inputDir = opts.inputDir || filesDir
  if (!existsSync(inputDir)) {
    throw new Error(`No such files directory: ${inputDir}`)
  }
  const zipFile = path.join(os.tmpdir(), `lancer-files-${Date.now()}.zip`)
  await createArchive(opts.inputDir || filesDir, zipFile)
  await uploadFiles(zipFile, host)
}

async function uploadFiles(zipFile: string, host: string) {
  const form = new FormData()
  form.append('zip', createReadStream(zipFile), {
    contentType: 'application/zip',
    filename: path.basename(zipFile),
  })
  const result = await fetch(`${host}/lancer/api/files/upload`, { method: 'POST', body: form })
  if (result.status >= 400 && result.status <= 500) {
    throw new Error(`uploadFiles failed: [${result.status}] ${await result.text()}`)
  }
}
