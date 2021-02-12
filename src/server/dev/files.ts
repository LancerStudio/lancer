import glob from 'glob'
import path from 'path'
import yazl from 'yazl'
import yauzl, { Entry } from 'yauzl'
import multiparty from 'multiparty'
import { createWriteStream, promises as fs } from 'fs'
import { Request, Router } from "express"


export function mountDevFiles(router: Router, filesDir: string) {
  router.post('/lancer/api/files/upload', async (req, res) => {
    const zip = await parseFilesUpload(req)
    if (!zip) {
      res.status(400).send('Invalid field name'); return
    }
    try {
      const { writeCount } = await importArchive(zip.path, filesDir)
      res.send({ writeCount })
    }
    catch (err) {
      console.error(`Error unloading ${zip.path}:\n`, err)
      res.status(500).send('Unexpected error.')
    }
  })
}


export function importArchive(archivePath: string, filesDir: string): Promise<{
  writeCount: number
}> {
  return new Promise((resolve, reject) => {
    let writeCount = 0
    yauzl.open(archivePath, { lazyEntries: true }, (err, zipFile) => {
      if (err) { reject(err); return }
      const zip = zipFile!
      zip.readEntry()
      zip.on('entry', async (entry: Entry) => {
        const isDir = /\/$/.test(entry.fileName)
        if (isDir) {
          // Nothing to do. Move on
          zip.readEntry(); return
        }

        const serverPath = path.join(filesDir, entry.fileName)

        await fs.mkdir(path.dirname(serverPath), { recursive: true })

        zip.openReadStream(entry, (err, readStream) => {
          if (err) { reject(err); return }
          const stream = readStream!
          stream.on('end', () => {
            writeCount += 1
            zip.readEntry()
          })
          stream.pipe(createWriteStream(serverPath))
        })
      })
      zip.on('end', () => resolve({ writeCount }))
    })
  })
}

type UploadedFile = {
  fieldName: string
  originalFilename: string
  path: string
  headers: Record<string, string>
  size: Number
}
function parseFilesUpload(req: Request): Promise<UploadedFile | null> {
  const form = new multiparty.Form()
  return new Promise((resolve, reject) => {
    form.parse(req, (err, _fields, { zip }) => {
      if (err) return reject(err)
      resolve(zip && zip[0] || null)
    })
  })
}


//
// Archiving
//
export function createArchive(srcDir: string, destZipFile: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const zip = new yazl.ZipFile()

    zip.outputStream.pipe(createWriteStream(destZipFile)).on("close", () => {
      resolve()
    })

    glob(path.join(srcDir, '/**/*'), { nodir: true }, (err, matches) => {
      if (err) reject(err)
      matches.forEach(file => {
        zip.addFile(file, file.replace(path.join(srcDir, '/'), ''))
      })
      zip.end()
    })
  })

}