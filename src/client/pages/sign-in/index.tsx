import React from 'react'
import { render } from 'react-dom'
import { ToastContainer, ToastProvider } from '../../lib/toast'
import { SignIn } from './screens/sign-in'

function App() {
  return (
    <ToastProvider>
      <ToastContainer />
      <SignIn />
    </ToastProvider>
  )
}

render(<App />, (window as any).app)
