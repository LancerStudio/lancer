import m from 'mithril'
import { ToastContainer } from '../../lib/toast'
import { SignIn } from './screens/sign-in'

function App() {
  return {
    view: () =>
      m(".min-h-screen",
        ToastContainer(),
        m(SignIn)
      )
  }
}

m.mount((window as any).app, App)
