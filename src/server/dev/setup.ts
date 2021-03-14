import { Handler } from "express";
import routes from '../../shared/routes';
import { knownKeys, Kv, User } from '../models';

declare global {
  namespace Express {
    interface Request {
      initialSetup?: 'complete' | 'needs-redirect' | 'on-page' | 'needs-auth'
    }
  }
}

const setupPage = routes.pages.setup
const signinPage = routes.pages.signIn

export function checkForInitialSetupState(): Handler {
  return (req, _res, next) => {
    req.initialSetup =
      Kv.get(knownKeys.onboarded) ? 'complete' :
      User.any() && !req.user ? 'needs-auth' :
      setupPage.match(req.path) ? 'on-page' :
      'needs-redirect'

    next()
  };
}

export function requireSetup(): Handler {
  return (req, res, next) => {
    if (req.initialSetup === 'needs-redirect') {
      res.redirect(setupPage.link())
    }
    else if (req.initialSetup === 'needs-auth' && !signinPage.match(req.path)) {
      res.redirect(signinPage.link())
    }
    else {
      next()
    }
  }
}
