import { existsSync, statSync } from "fs"

import {z, rpc, allowAnonymous} from '../rpc.js'
import { filesDir, siteConfig } from '../../config.js'
import { missingFiles } from '../state.js'

export const getDevStatus = rpc(
  z.object({}),
  async function () {
    return { missingFiles }
  }
)

export const getSiteInfo = rpc(
  z.object({}),
  async function () {
    const site = await siteConfig()
    return {
      name: site.name,
      locales: site.locales,
    }
  }
)
allowAnonymous(getSiteInfo)

export const getFileInfo = rpc(
  z.object({
    file: z.string()
  }),
  async function ({ file }) {
    if (!file.startsWith(filesDir)) {
      throw new Error('Access denied (filepath)')
    }
    return {
      file: file.replace(filesDir, '/files'),
      stat: existsSync(file) && statSync(file),
    }
  }
)

export const getLocales = rpc(
  z.object({
    name: z.string(),
  }),
  async function ({}) {
    const site = await siteConfig()
    const existing: string[] = [] // TODO
    return site.locales.reduce((all, loc) => {
      all[loc] = existing.includes(loc)
      return all
    }, {} as Record<string, boolean>)
  }
)

export const getTranslation = rpc(
  z.object({
    name: z.string(),
    locale: z.string(),
  }),
  async function ({}) {
    // TODO
    return {} as any
  }
)

export const updateTranslations = rpc(
  z.array(
    z.object({
      name: z.string(),
      locale: z.string(),
      value: z.string(),
      version: z.number().optional(),
      meta: z.object({
        link: z.boolean().optional(),
        rich: z.boolean().optional(),
        multiline: z.boolean().optional(),
      }).optional(),
    }),
  ),
  async function (_updates) {
    return {
      results: [] as any[]
    }
  }
)
