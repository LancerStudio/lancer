import { useState } from "react"
import TextareaAutosize from 'react-autosize-textarea'

import { ProcTypes, Rpc } from "../lib/rpc-client"
import { usePromise } from "../lib/use-promise"
import { useToasts } from "../lib/toast"
import { Editor } from '../../prosemirror/Editor'
import { Loader } from "../components/Loader"
import { Button } from "../components/Button"

type Props = {
  name: string
  locale: string
  onClose: () => void
  mode: 'plaintext' | 'inline' | 'block'
}
export function EditTranslation({ name, locale: initialLocale, mode, onClose }: Props) {
  const [locale, setLocale] = useState(initialLocale)
  const [content, setContent] = useState('')
  const { quickToast } = useToasts()

  const req = usePromise(async () => {
    const result = await Rpc.getTranslation({ name, locale })
    if (result.t) {
      setContent(result.t.value)
    }
    else if (content) {
      // Scenario:
      // - User has this screen already open
      // - User clicks on another translation
      // - Translation has no content
      setContent('')
    }
    return result
  }, { invoke: true, deps: [locale] })

  const update = usePromise(Rpc.updateTranslation)

  const wrap = (content: (data: ProcTypes['getTranslation']) => React.ReactNode) => (
    <div className="p-6 sm:p-10 sm:m-8 rounded-sm bg-gray-100 dark:bg-blue-900 text-blue-800 shadow-xl w-full max-w-4xl">
      <h2 className="font-header text-xl sm:text-2xl dark:text-blue-200">
        Edit Translation
        {req.isLoading && req.data &&
          <Loader className="ml-2 text-primary-500 inline-block h-4 w-4" />
        }
      </h2>
      {req.isLoading && !req.data ?
        <Loader />
        : req.error
        ? <div>An error occured.</div>
        : content(req.data!)
      }
    </div>
  )

  return wrap(({ t, locales }) => (
    <div className="mt-3 sm:mt-4">
      <div className="flex flex-wrap space-x-1">
        {Object.entries(locales).map(([loc, isSet]) =>
          <div
            key={loc}
            className={`${
              loc === locale ? 'bg-blue-500 dark:bg-gray-200 text-white dark:text-gray-900' :
              // !isSet ? 'cursor-pointer dark:bg-gray-600 hover:bg-blue-300 dark:hover:bg-gray-600 text-gray-700' :
              !isSet ? 'cursor-pointer text-red-700 dark:text-red-500' :
              'cursor-pointer text-gray-700 dark:text-gray-400'
            } uppercase flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium`}
            onClick={() => {
              if (locale !== loc) {
                setLocale(loc)
              }
            }}
          >
            {loc}
          </div>
        )}
      </div>

      {mode === 'plaintext' &&
        <TextareaAutosize
          value={content}
          onChange={e => setContent(e.currentTarget.value.replace(/[\n\r]/g, ''))}
          onKeyPress={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
            }
          }}
          className="mt-3 block w-full border border-gray-400 rounded-sm focus:ring-0 focus:border-indigo-400"
          style={{ maxHeight: '50vh' }}
        />
      }

      {mode === 'block' &&
        <Editor
          content={content}
          onChange={setContent}
          className="mt-4"
        />
      }

      <div className="mt-3 flex justify-end">
        <Button
          title="Cancel"
          color="secondary"
          onClick={() => {
            if (
              content !== (t?.value || '') &&
              !confirm(`Are you sure? You have unsaved changes.`)
            ) {
              return
            }
            onClose()
          }}
          disabled={update.isLoading}
        />
        <Button
          title="Save"
          color="primary"
          className="ml-3"
          onClick={async () => {
            const result = await update.call({ name, locale, value: content, currentVersion: t?.version || null })
            if (result.success === false) {
              quickToast('error', `Error: Unable to save ${locale.toUpperCase()}.`)
              return
            }
            const updated = await req.call()
            quickToast('success', `Saved ${locale.toUpperCase()} successfully.`)
            const elem = document.querySelector(`[data-t-name="${name}"][data-t-locale="${locale}"]`)
            if (elem) {
              elem.innerHTML = updated.t!.value
            }
            if (locale === initialLocale) {
              onClose()
            }
          }}
        />
      </div>
    </div>
  )
}
