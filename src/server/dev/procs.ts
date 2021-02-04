import { existsSync, statSync } from "fs"

import {z, rpc} from './rpc'
import { filesDir, siteConfig } from "../config"
import { missingFiles } from "./state"
import { Translation } from "../models"

export const getDevStatus = rpc(
  z.object({}),
  async function () {
    return { missingFiles }
  }
)

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

export const getTranslation = rpc(
  z.object({
    name: z.string(),
    locale: z.string(),
  }),
  async function ({ name, locale }) {
    const site = siteConfig()
    const existing = Translation.localesFor(name)
    return {
      t: Translation.get(name, locale),
      locales: site.locales.reduce((all, loc) => {
        all[loc] = existing.includes(loc)
        return all
      }, {} as Record<string, boolean>)
    }
  }
)

export const updateTranslation = rpc(
  z.object({
    name: z.string(),
    locale: z.string(),
    value: z.string(),
    currentVersion: z.number().or(z.null()),
  }),
  async function ({ name, locale, value, currentVersion }) {
    return {
      success: Translation.set(name, locale, value, currentVersion),
    }
  }
)
