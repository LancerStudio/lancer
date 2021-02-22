import { Router, RequestHandler, Request, Response } from 'express'
import expressSession, { Store } from 'express-session'
import events, { EventEmitter } from 'events'

import { db, User } from '../models'
import { DB } from './db'
import { env, sessionSecret } from '../config'
import routes from '../../shared/routes'
import { UserRow } from '../models/user'

type Session = Record<string, any>

declare global {
  namespace Express {
    interface Request {
      user: UserRow | null
    }
  }
}

declare module 'express-session' {
  interface SessionData {
    user_id: number
    returnTo?: string
  }
}

export function mountSession(router: Router) {
  router.use( expressSession({
    store: new SQLiteStore(db),
    resave: false,
    secret: sessionSecret,
    saveUninitialized: false,
    cookie: {
      secure: env.production
    },
  }) )

  router.use((req, _res, next) => {
    req.user = req.session.user_id ? User.get(req.session.user_id) : null
    next()
  })
}

export function requireUser(opts: { redirectIfNot?: boolean } = {}): RequestHandler {
  return (req, res, next) => {
    const isSignInPage = !!routes.pages.signIn.match(req.path)
    if (req.user) {
      next()
    }
    else if (req.initialSetup === 'on-page' && routes.pages.setup.match(req.path)) {
      next()
    }
    else if ((req.initialSetup === 'needs-auth' || opts.redirectIfNot) && !isSignInPage) {
      req.session.returnTo = req.path || '/'
      res.redirect(routes.pages.signIn.link())
    }
    else if (!isSignInPage) {
      // TODO: Show nice 404 page
      res.status(404).send('Not found.')
    }
    else {
      next()
    }
  }
}

export function checkTempPasswordMiddleware(): RequestHandler {
  return (req, res, next) => {
    if (guardTempPassword(req, res)) {
      return
    }
    next()
  }
}

export function guardTempPassword(req: Request, res: Response) {
  if (req.user?.password_temporary && !routes.pages.setPassword.match(req.path)) {
    req.session.returnTo = req.path
    res.redirect(routes.pages.setPassword.link())
    return true
  }
  return false
}

const ONE_DAY = 86400000

export class SQLiteStore extends Store {
  table: string
  client: EventEmitter

  constructor(private db: DB, options: {
    table?: string
    concurrentDb?: boolean
  }={}) {
    super()
    options = options || {}

    this.table = options.table || 'lancer_sessions'
    this.client = new events.EventEmitter()

    this.client.emit('connect')
    setInterval(() => this._dbCleanup, ONE_DAY, this).unref()
  }

  get = wrapForNode((sid: string) => {
    const now = new Date().getTime()
    const row = this.db.get(`SELECT sess FROM ${this.table} WHERE sid = ? AND ? <= expired`, sid, now)
    return row && JSON.parse(row.sess)
  })

  set = wrapForNode((sid: string, sess: Session) => {
    const maxAge = sess.cookie.maxAge
    const now = new Date().getTime()
    const expired = maxAge ? now + maxAge : now + ONE_DAY
    this.db.run(`INSERT OR REPLACE INTO ${this.table} VALUES (?, ?, ?)`, sid, expired, JSON.stringify(sess))
  })

  destroy = wrapForNode((sid: string) => {
    this.db.run(`DELETE FROM ${this.table} WHERE sid = ?`, sid)
  })

  length = wrapForNode(() => {
    const [count] = this.db.pluck<number>(`SELECT COUNT(*) AS count FROM ${this.table}`)
    return count
  })

  clear = wrapForNode(() => {
    this.db.run(`DELETE FROM ${this.table}`)
    return true
  })

  touch = wrapForNode((sid: string, session: Session) => {
    if (session && session.cookie && session.cookie.expires) {
      const now = new Date().getTime()
      const cookieExpires = new Date(session.cookie.expires).getTime()
      this.db.run(`UPDATE ${this.table} SET expired=? WHERE sid = ? AND ? <= expired`, cookieExpires, sid, now)
    }
    return true
  })

  private _dbCleanup() {
    var now = new Date().getTime()
    this.db.run(`DELETE FROM ${this.table} WHERE ? > expired`, now)
  }
}

function wrapForNode(fn: (...args: any[]) => any) {
  return (...argsWithCallback: any[]) => {
    const cb = argsWithCallback[argsWithCallback.length - 1]
    const args = argsWithCallback.slice(0, argsWithCallback.length - 1)
    try {
      cb(null, fn(...args))
    }
    catch(err) {
      cb(err)
    }
  }
}
