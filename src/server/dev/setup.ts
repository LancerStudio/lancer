import { Handler } from "express";
import routes from '../../shared/routes';
import { knownKeys, Kv } from '../models';

declare global {
  namespace Express {
    interface Request {
      initialSetup?: 'complete' | 'needs-redirect' | 'on-page'
    }
  }
}

const route = routes.pages.setup

export function checkForInitialSetupState(): Handler {
  return (req, _res, next) => {
    req.initialSetup =
      Kv.get(knownKeys.onboarded) ? 'complete' :
      route.match(req.path) ? 'on-page' :
      'needs-redirect'

    next()
  };
}

export function requireSetup(): Handler {
  return (req, res, next) => {
    if (req.initialSetup === 'needs-redirect') {
      res.redirect(route.link())
    }
    else {
      next()
    }
  }
}
