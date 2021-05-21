import { Router } from 'express'
import expressSession, { Store } from 'express-session'
import events, { EventEmitter } from 'events'

import { db, User } from '../models/index.js'
import { DB } from './db.js'
import { env, sessionSecret } from '../config.js'
import { UserRow } from '../models/user.js'

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
