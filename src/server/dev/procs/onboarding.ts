import { User, Kv, knownKeys, isUniqueConstraint } from "../../models"
import { ProcAuthError } from "../errors"
import { allowAnonymous, bad, ok, rpc, RpcContext, z } from "../rpc"


export const getOnboardingStatus = rpc(
  z.object({}),
  async function (_, { req }: RpcContext) {
    if (User.any() && !req.user) {
      throw new ProcAuthError()
    }
    return {
      self: req.user,
      users: User.allWithPrimaryEmail(),
      use_case: Kv.get(knownKeys.use_case) as 'client' | 'personal' | null,
    }
  }
)
allowAnonymous(getOnboardingStatus)


export const setUseCase = rpc(
  z.object({
    type: z.union([z.literal('client'), z.literal('personal')]),
  }),
  async function ({ type }) {
    await Kv.upsert(knownKeys.use_case, type)
    return ok({})
  }
)
allowAnonymous(setUseCase)


export const createFirstUser = rpc(
  z.object({
    name: z.string(),
    email: z.string(),
    password: z.string(),
  }),
  async function ({ name, email, password }, { req }: RpcContext) {
    if (!email.match(/^.+@.+$/)) {
      return bad('invalid_email', { message: 'Invalid email' })
    }
    if (password.length < 10) {
      return bad('invalid_password', { message: 'Password length too short (min. 10 characters)' })
    }
    const id = await User.create(email, password, {
      name,
      type: 'dev',
      password_temporary: 0,
    })

    req.session.user_id = id

    return ok({})
  }
)
allowAnonymous(createFirstUser)


export const createUser = rpc(
  z.object({
    name: z.string(),
    type: z.union([z.literal('client'), z.literal('dev')]),
    email: z.string(),
  }),
  async function ({ name, type, email }) {
    if (!email.match(/^.+@.+$/)) {
      return bad('invalid_email', { message: 'Invalid email' })
    }
    const temporaryPassword = new Array(10).fill(0).map(() => alpha[Math.floor(Math.random() * alpha.length)]).join('')

    try {
      const user_id = await User.create(email, temporaryPassword, { name, type, password_temporary: 1 })
      return ok({ user_id, temporaryPassword })
    }
    catch(err) {
      if (isUniqueConstraint(err)) {
        return bad('email_taken', { message: 'Email address is taken' })
      }
      throw err
    }
  }
)


export const markOnboardingComplete = rpc(
  z.object({}),
  async function () {
    await Kv.upsert(knownKeys.onboarded, 'true')
    return true
  }
)


const alpha = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ123456789'
