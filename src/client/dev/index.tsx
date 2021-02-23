import React, { useEffect, useState } from 'react'
import { render } from 'react-dom'

import { Notification } from './notification'
import { useNavigation } from './lib/navigation'
import { EditFile } from './screens/EditFile'
import { ProcResults, Rpc } from './lib/rpc-client'
import { Lancer } from './global'
import { EnterExit } from './components/EnterExit'
import { ToastContainer, ToastProvider, useToasts } from '../lib/toast'

type DevStatus = ProcResults['getDevStatus']

function DevApp() {
  const [status, setStatus] = useState<DevStatus>({
    missingFiles: {}
  })
  const { addToast } = useToasts()
  const [closing, setClosing] = useState(false)
  const nav = useNavigation()

  useEffect(() => {
    return Lancer.emitter.on('status-update', (update: DevStatus) => {
      for (let path in update.missingFiles) {
        if (!status.missingFiles[path]) {
          addToast(({ id, close }) =>
            <Notification
              key={id}
              closeToast={close}
              type="warning"
              title="Missing File Detected"
              body={close => <>
                <p>You're requesting <code className="text-gray-900">{path}</code> in your code, but no file exists at that location.</p>
                <div className="h-3"></div>
                <button
                  className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  onClick={() => {
                    nav.push(() => <EditFile filePath={path} onClose={close} />)
                  }}
                >
                  Upload File
                </button>
                <button
                  onClick={close}
                  className="ml-3 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Ignore Forever
                </button>
              </>}
            />
          )
        }
      }
      setStatus(update)
    })
  }, [setStatus])


  return <div className="Lancer">
    <ToastProvider>
      <ToastContainer />

      <EnterExit
        show={!!nav.current && !closing}
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        enter="ease-out duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="ease-in duration-200"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
        onHide={() => {
          setClosing(false)
          nav.clear()
        }}
      >
        <EnterExit
          show={!!nav.current && !closing}
          className="absolute inset-0 flex items-center justify-center transform transition-all"
          enter="ease-out duration-300"
          enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          enterTo="opacity-100 translate-y-0 sm:scale-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100 translate-y-0 sm:scale-100"
          leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
        >
          {nav.current && nav.current.component({
            close: () => setClosing(true)
          })}
        </EnterExit>
      </EnterExit>
    </ToastProvider>
  </div>
}

document.addEventListener('DOMContentLoaded', () => {
  const mountPoint = document.createElement('div')
  document.body.appendChild(mountPoint)
  render(<DevApp />, mountPoint)
  checkDevStatus()
}, false)

let delay = 1000
async function checkDevStatus() {
  const status = await Rpc.getDevStatus({})
  console.log(status)
  Lancer.emitter.emit('status-update', status)
  setTimeout(checkDevStatus, delay)
  delay *= 500.25
}
