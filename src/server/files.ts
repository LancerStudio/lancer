import path from 'path'
import sharp from 'sharp'
import isEqual from 'lodash/isEqual'
import { existsSync, promises as fs, statSync } from 'fs'

import { env, filesDir, previewsDir, SiteConfig } from "./config"
import { requireLatest } from './lib/fs'


const SUPPORTED_EXTS = [
  '.avif',
  '.gif',
  '.jpeg',
  '.jpg',
  '.png',
  '.tiff',
  '.webp',
]

const DISALLOWED_CHARS = '.'
const DISALLOWED_RE = new RegExp(`[${DISALLOWED_CHARS}]`)

type Options = {
  site: SiteConfig
  preview?: string
}
export async function resolveFile(file: string, { site, preview }: Options): Promise<string | false> {
  const ext = path.extname(file).toLocaleLowerCase()

  if (!preview) {
    return file
  }
  if (preview.match(DISALLOWED_RE)) {
    if (env.production) return false
    throw new Error(`Invalid preview name (${preview})\n  Disallowed characters: ${DISALLOWED_CHARS.split('').map(c => `'${c}'`).join(', ')}`)
  }
  if (!SUPPORTED_EXTS.includes(ext)) {
    throw new Error(`Unsupported image format (${ file.replace(filesDir, '/files/') })\n  Supported extensions: ${SUPPORTED_EXTS.join(', ')}`)
  }

  const previewConfig = typeof site.imagePreviews === 'function'
    ? site.imagePreviews(sharp)[preview]
    : site.imagePreviews && site.imagePreviews[preview]

  if (!previewConfig) {
    if (env.production) return false
    throw new Error(`No such imagePreview (${preview})`)
  }

  const previewFile = file
    .replace(filesDir, previewsDir)
    .replace(
      new RegExp(`${path.extname(file)}$`),
      `.preview-${preview}${ext}`
    )

  const previewConfigFile = previewFile + '.json'

  if (
    !existsSync(previewFile) ||
    !existsSync(previewConfigFile) ||
    isNewer(file, previewFile) ||
    !isEqual(requireLatest(previewConfigFile).module, previewConfig)
  ) {
    await fs.mkdir(path.dirname(previewFile), { recursive: true })
    await sharp(file)
      .withMetadata()
      .resize(previewConfig)
      .toFile(previewFile)
    await fs.writeFile(previewConfigFile, JSON.stringify(previewConfig))
  }

  return previewFile
}

function isNewer(file1: string, file2: string) {
  const stat1 = statSync(file1)
  const stat2 = statSync(file2)
  return stat1.ctimeMs > stat2.ctimeMs || stat1.mtimeMs > stat2.mtimeMs
}
