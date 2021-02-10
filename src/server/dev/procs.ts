import { existsSync, statSync } from "fs"
import { Request } from 'express'

import {z, rpc} from './rpc'
import { filesDir, siteConfig } from "../config"
import { missingFiles } from "./state"
import { Translation, User } from "../models"
import { ProcAuthError } from "./errors"

const ok = <T>(data: T) => ({ type: 'success', data } as const)
const bad = <C extends string, D>(code: C, data: D) => ({ type: 'error', code, data } as const)

type RpcContext = {
  req: Request
}

export const getDevStatus = rpc(
  z.object({}),
  async function () {
    return { missingFiles }
  }
)

export const getSiteInfo = rpc(
  z.object({}),
  async function () {
    const site = siteConfig()
    return {
      name: site.name,
      locales: site.locales,
    }
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
          return ok({ current })
        }
        return bad('fail', { current, failed: update })
      })
    }
  }
)

export const signIn = rpc(
  z.object({
    email: z.string(),
    password: z.string(),
  }),
  async function ({ email, password }, { req }: RpcContext) {
    const user = User.findByEmail(email)
    if (!user || !(await User.verify(user.id, password))) {
      return bad('invalid', { message: 'Bad email/password' })
    }
    req.session.user_id = user.id
    return ok(null)
  }
)

export const updatePassword = rpc(
  z.object({
    currentPassword: z.string().optional(),
    newPassword: z.string(),
  }),
  async function ({ newPassword }, { req }: RpcContext) {
    const user = requireUser(req)
    if (!user.password_temporary) {
      // TODO: Check if currentPassword is correct
    }
    User.updatePassword(user.id, newPassword)
    return ok({ returnTo: req.session.returnTo || '/' })
  }
)


//
// Helpers
//
function requireUser(req: RpcContext['req']) {
  if (!req.user) {
    throw new ProcAuthError()
  }
  return req.user
}
