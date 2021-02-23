import React from 'react'
import { render } from 'react-dom'
import { ToastContainer, ToastProvider } from '../../lib/toast'
import { UpdateTempPass } from './screens/update-temp-pass'

function App() {
  return (
    <ToastProvider>
      <ToastContainer />
      <UpdateTempPass />
    </ToastProvider>
  )
}

render(<App />, (window as any).app)
