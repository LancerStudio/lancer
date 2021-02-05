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

export const getLocales = rpc(
  z.object({
    name: z.string(),
  }),
  async function ({ name }) {
    const site = siteConfig()
    const existing = await Translation.localesFor(name)
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
  async function ({ name, locale }) {
    return Translation.get(name, locale)
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
        rich: z.boolean().optional(),
        multiline: z.boolean().optional(),
      }).optional(),
    }),
  ),
  async function (updates) {
    return {
      results: updates.map((update) => {
        const result = Translation.set(update)
        const current = Translation.get(update.name, update.locale)!
        if (result) {
          return {
            type: 'success' as const,
            current,
          }
        }
        return {
          type: 'failure' as const,
          failed: update,
          current,
        }
      })
    }
  }
)
