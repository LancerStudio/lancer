import { Router } from 'express'

declare global {
  namespace Express {
    interface Request {
      // TODO
      user: unknown | null
    }
  }
}

declare module 'express-session' {
  interface SessionData {
    user_id: number
    returnTo?: string
  }
}

export function mountSession(_router: Router) {
  // TODO
  // router.use( expressSession({
  //   store: ...,
  //   resave: false,
  //   secret: sessionSecret,
  //   saveUninitialized: false,
  //   cookie: {
  //     secure: env.production
  //   },
  // }) )

  // router.use((req, _res, next) => {
  //   req.user = req.session.user_id ? User.get(req.session.user_id) : null
  //   next()
  // })
}
