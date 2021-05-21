import { existsSync, statSync } from "fs"

import {z, rpc, bad, ok, allowAnonymous, RpcContext} from '../rpc'
import { filesDir, siteConfig } from '../../config.js'
import { missingFiles } from '../state.js'
import { Translation, User } from "../../models"

export * from './onboarding'

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
        link: z.boolean().optional(),
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
allowAnonymous(signIn)

export const updatePassword = rpc(
  z.object({
    currentPassword: z.string().optional(),
    newPassword: z.string(),
  }),
  async function ({ newPassword }, { req, user }: RpcContext) {
    if (!user.password_temporary) {
      // TODO: Check if currentPassword is correct
    }
    User.updatePassword(user.id, newPassword)
    return ok({ returnTo: req.session.returnTo || '/' })
  }
)
