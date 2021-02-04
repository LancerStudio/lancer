import path from 'path'
import { existsSync, promises as fs, statSync } from 'fs'
import sharp from 'sharp'
import { env, filesDir, previewsDir, site } from "./config"


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
  preview?: string
}
export async function resolveFile(file: string, { preview }: Options): Promise<string | false> {
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

  if (!existsSync(previewFile) || statSync(previewFile).ctimeMs < statSync(file).ctimeMs) {
    await fs.mkdir(path.dirname(previewFile), { recursive: true })
    await sharp(file)
      .resize(previewConfig)
      .toFile(previewFile)
  }

  return previewFile
}
