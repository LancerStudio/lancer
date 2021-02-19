import { render } from 'react-dom'
import { ToastContainer, ToastProvider } from '../../lib/toast'
import { Welcome } from './screens/welcome'
import { CreateFirstUser } from './screens/create-first-user'
import { useState } from 'react'
import CheckCircleSm from '../../lib/icons/CheckCircleSm'
import { usePromise } from '../../dev/lib/use-promise'
import { ProcResults, Rpc } from '../../dev/lib/rpc-client'
import { Loader } from '../../dev/components/Loader'
import { CreateOtherUsers } from './screens/create-other-users'
import { Complete } from './screens/complete'

type Status = ProcResults['getOnboardingStatus']

function App() {
  const status = usePromise(Rpc.getOnboardingStatus, { invoke: true })
  return (
    <ToastProvider>
      <ToastContainer />
      <div className="min-h-screen flex flex-col justify-center py-10 sm:px-6 lg:px-8 md:pb-16">
        {status.isLoading && !status.data
          ? <Loader />
          : <LoadedApp status={status.data!} reloadStatus={async () => { await status.call({}) }} />
        }
      </div>
    </ToastProvider>
  )
}

render(<App />, (window as any).app)



type Step = typeof steps[0]
type SetupScreen = typeof steps[0]['name']

const steps = [
  { name: 'Welcome' as const, title: 'Welcome', index: 0 },
  { name: 'CreateFirstUser' as const, title: 'Account Setup', index: 1 },
  { name: 'CreateOtherUsers' as const, title: 'Additional Users', index: 2 },
]

function LoadedApp({ status, reloadStatus }: { status: Status, reloadStatus: () => Promise<void> }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [stepName, setStepName] = useState<SetupScreen | 'complete'>(() => {
    let screen: SetupScreen = 'Welcome'
    if (status.self) {
      screen = 'CreateOtherUsers'
    }
    return screen
  })
  const step = steps.find(s => s.name === stepName) || null

  return (
    <div className="FadeInLong">
      <div className="flex flex-col items-center">
        <div className="mt-4">
          <h2 className="flex items-center font-header-alt font-bold text-4xl text-gray-900 text-center">
            <img src="/lancer/logo-icon.svg" className="h-7" />
            <span className="ml-1 relative" style={{ left: '0.4rem' }}>Lancer</span>
          </h2>
          <Steps current={step} className="mt-6" />
        </div>
      </div>

      <div className="mt-10">
        {
          step === null ?
            <Complete /> :
          step.name === 'Welcome' ?
            <Welcome
              next={(n, e) => { setName(n); setEmail(e); setStepName('CreateFirstUser') }}
            /> :
          step.name === 'CreateFirstUser' ?
            <CreateFirstUser
              name={name}
              email={email}
              next={async () => { await reloadStatus(); setStepName('CreateOtherUsers') }}
            /> :
          step.name === 'CreateOtherUsers' ?
            <CreateOtherUsers
              next={async () => { setStepName('complete') }}
              status={status}
              reloadStatus={reloadStatus}
            /> :
          `No such screen: ${stepName}`
        }
      </div>
    </div>
  )
}


function Steps({current, className}: { current: Step | null, className?: string }) {
  return (
    <nav className={`flex justify-center ${className}`} aria-label="Progress">
      <ol className="space-y-6 w-full">

        {steps.map(step =>
          current === null || step.index < current.index ? (
            <div key={step.index} className="group">
              <span className="flex items-start">
                <span className="flex-shrink-0 relative h-5 w-5 flex items-center justify-center">
                  <CheckCircleSm className="h-full w-full text-gray-800" />
                </span>
                <span className="ml-3 text-sm font-medium text-gray-500">{step.title}</span>
              </span>
            </div>
          ) : step.index === current.index ? (
            <div key={step.index} className="flex items-start" aria-current="step">
              <span className="flex-shrink-0 h-5 w-5 relative flex items-center justify-center" aria-hidden="true">
                <span className="absolute h-4 w-4 rounded-full bg-gray-400 bg-opacity-50"></span>
                <span className="relative block w-2 h-2 bg-gray-800 rounded-full"></span>
              </span>
              <span className="ml-3 text-sm font-medium text-gray-900">{step.title}</span>
            </div>
          ) : (
            <div key={step.index} className="flex items-start">
              <div className="flex-shrink-0 h-5 w-5 relative flex items-center justify-center" aria-hidden="true">
                <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
              </div>
              <p className="ml-3 text-sm font-medium text-gray-500">{step.title}</p>
            </div>
          )
        )}
      </ol>
    </nav>
  )
}
