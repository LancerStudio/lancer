import { route } from '../server/lib/route.js'

const routes = {
  pages: route('/lancer', undefined, {
    signIn: route('/sign-in'),
    setPassword: route('/set-password'),
    setup: route('/setup'),
  }),
}

export default routes
