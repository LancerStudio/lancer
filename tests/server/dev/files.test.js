import o  from 'ospec'
import fs  from 'fs'
import os  from 'os'
import path  from 'path'
import { createArchive, importArchive } from '../../../dist/server/dev/files.js'

const tmpDir = os.tmpdir()

o.spec('server.dev.files', () => {

  o('importArchive overwrites everything', async () => {
    o.timeout(1000)
    const clientDir = path.join(tmpDir, 'client')
    const serverDir = path.join(tmpDir, 'server')
    const zipFile = path.join(tmpDir, 'client.zip')

    del(zipFile)

    create('client/1.txt')
    create('client/2.txt')
    create('client/subdir/3.txt')
    create('client/subdir/4.txt')

    create('server/1.txt')
    create('server/2.txt')
    create('server/subdir/3.txt')
    create('server/subdir/4.txt')
    create('server/other.txt')

    await createArchive(clientDir, zipFile)

    const { writeCount } = await importArchive(zipFile, serverDir)

    o( writeCount ).equals(4)

    o( read('server/1.txt') ).equals('client/1.txt')
    o( read('server/2.txt') ).equals('client/2.txt')
    o( read('server/subdir/3.txt') ).equals('client/subdir/3.txt')
    o( read('server/subdir/4.txt') ).equals('client/subdir/4.txt')
    o( read('server/other.txt') ).equals('server/other.txt')
  })
})

function tmp(file) {
  return path.join(tmpDir, file)
}
function create(file, time) {
  const dest = tmp(file)
  del(dest)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, file)
}
function read(file) {
  return fs.readFileSync(tmp(file), 'utf8')
}
function del(file) {
  if (fs.existsSync(file)) {
    fs.unlinkSync(file)
  }
}
