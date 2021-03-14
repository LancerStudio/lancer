import { Handler, RequestHandler, Request, Response } from 'express'
import routes from '../../shared/routes';
import { knownKeys, Kv, User } from '../models';

declare global {
  namespace Express {
    interface Request {
      initialSetup?: 'complete' | 'needs-setup' | 'on-setup-page' | 'needs-auth' | 'needs-set-password'
    }
  }
}

const pages = routes.pages

export function checkForInitialSetupState(): Handler {
  return (req, _res, next) => {
    req.initialSetup =
      Kv.get(knownKeys.onboarded) ? 'complete' :
      User.any() && !req.user ? 'needs-auth' :
      req.user && req.user.password_temporary ? 'needs-set-password' :
      'needs-setup'

    next()
  };
}

export function requireSetup(): Handler {
  return (req, res, next) => {
    if (req.initialSetup === 'needs-set-password' && !pages.setPassword.match(req.path)) {
      res.redirect(pages.setPassword.link())
    }
    else if (req.initialSetup === 'needs-auth' && !pages.signIn.match(req.path)) {
      res.redirect(pages.signIn.link())
    }
    else if (req.initialSetup === 'needs-setup' && !pages.setup.match(req.path)) {
      res.redirect(pages.setup.link())
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
  if (req.user?.password_temporary && !pages.setPassword.match(req.path)) {
    req.session.returnTo = req.path
    res.redirect(pages.setPassword.link())
    return true
  }
  return false
}
