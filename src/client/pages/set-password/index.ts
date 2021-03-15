import m from 'mithril'
import { ToastContainer } from '../../lib/toast'
import { UpdateTempPass } from './screens/update-temp-pass'

function App() {
  return {
    view: () =>
      m(".min-h-screen",
        ToastContainer(),
        m(UpdateTempPass)
      )
  }
}

m.mount((window as any).app, App)
