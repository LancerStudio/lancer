import { useState } from "react"
import TextareaAutosize from 'react-autosize-textarea'

import { ProcParams, ProcResults, Rpc } from "../lib/rpc-client"
import { usePromise } from "../lib/use-promise"
import { useToasts } from "../../lib/toast"
import { Editor } from '../../prosemirror/Editor'
import { Loader } from "../components/Loader"
import { Button } from "../components/Button"
import { useKeyValueState } from "../lib/hooks"
import { textInputClass } from "../../lib/ui"

type Draft = {
  t: ItemType<ProcParams['updateTranslations']>
  originalValue: string
}
type Conflict = {
  version: number
  value: string
}


type Props = {
  name: string
  locale: string
  onClose: () => void
  rich?: boolean
  multiline: boolean
}
export function EditTranslation({ name, locale: initialLocale, rich, multiline, onClose }: Props) {
  const meta = {
    rich,
    multiline,
  }
  const [locale, setLocale] = useState(initialLocale)
  const [loadingLocale, loadLocale] = useState(initialLocale)
  const [drafts, setDraft, updateDraft] = useKeyValueState<Draft>()
  const [conflicts, setConflict] = useKeyValueState<Conflict>()

  const { quickToast } = useToasts()

  const req = usePromise(async () => {
    const [t, locales] = await Promise.all([
      Rpc.getTranslation({ name, locale: loadingLocale }),
      Rpc.getLocales({ name })
    ])
    const local = drafts[loadingLocale]

    if (!local) {
      setDraft(loadingLocale, createDraft(name, loadingLocale, t?.value || '', meta))
    }

    if (t && !local) {
      setDraft(loadingLocale, {
        t: {
          ...t,
          value: multiline ? t.value : t.value.replace(NL, ' '),
          //
          // We store the meta to send to the server on save;
          // it'll be useful to know how this translation value was edited by the user,
          // especially if the dev decides to later change rich/multiline in the source.
          //
          meta: meta,
        },
        originalValue: t.value,
      })
    }
    else if (t) {
      setConflict(loadingLocale, {
        value: t.value,
        version: t.version,
      })
    }

    if (locale !== loadingLocale) {
      setLocale(loadingLocale)
    }
    return { t, locales }
  }, { invoke: true, deps: [loadingLocale] })

  const update = usePromise(Rpc.updateTranslations)

  async function save() {
    if (update.isLoading) return

    const { results } = await update.call(
      Object
        .values(drafts)
        .filter(draft => draft.t.value !== draft.originalValue)
        .map(draft => draft.t)
    )
    for (const result of results) {
      const { current } = result.data
      const resultLocale = current.locale
      if (result.type === 'error') {
        quickToast('error', `Error: Unable to save ${result.data.failed.locale.toUpperCase()}.`, { timed: false, key: `${resultLocale}_failure` })
        continue
      }

      setDraft(resultLocale, {
        t: current,
        originalValue: current.value,
      })

      if (resultLocale === locale) {
        req.update({ t: current })
      }

      quickToast('success', `Saved ${resultLocale.toUpperCase()} successfully.`)
      const elem = document.querySelector(`[data-t-name="${name}"][data-t-locale="${resultLocale}"]`)
      if (elem) {
        elem.innerHTML = current.value
      }
      if (locale === initialLocale && results.every(r => r.type === 'success')) {
        onClose()
      }
    }

    const locales = await Rpc.getLocales({ name })
    req.update({ locales })
  }


  const wrapLoader = (content: (data: ProcResults['getLocales']) => React.ReactNode) => (
    <div className="p-6 sm:p-10 sm:m-8 rounded-lg bg-gray-200 text-gray-800 shadow-xl w-full max-w-4xl">
      <h2 className="font-header text-lg sm:text-2xl">
        Edit Translation
        <span className="ml-2 text-xs text-gray-500">{name}</span>
        {req.isLoading && req.data &&
          <Loader className="ml-2 text-primary-500 inline-block h-4 w-4" />
        }
      </h2>
      {req.isLoading && !req.data ?
        <Loader />
        : req.error
        ? <div>An error occured. <Button title="Close" onClick={onClose} /></div>
        : content(req.data!.locales)
      }
    </div>
  )

  // We can be confident this is set since wrapLoader() ensures the initial request is complete
  const current = drafts[locale]!
  const dirty = Object.values(drafts).some(draft => draft.t.value !== draft.originalValue)


  return wrapLoader(locales => (
    <div className="mt-3 sm:mt-4">
      <div className="flex flex-wrap space-x-1">
        {Object.entries(locales).map(([loc, isSet]) =>
          <div
            key={loc}
            className={`${
              loc === locale ? 'bg-gray-800 text-white' :
              !isSet ? 'cursor-pointer text-red-700' :
              'cursor-pointer text-gray-700'
            } uppercase flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium`}
            onClick={() => {
              if (locale !== loc) {
                loadLocale(loc)
              }
            }}
          >
            {loc}
          </div>
        )}
      </div>

      {rich ? <>
        <Editor
          content={current.t.value}
          onChange={value => updateDraft(locale, { t: { ...current.t, value } })}
          className="mt-4"
          multiline={!!multiline}
        />
      </> : <>
        <TextareaAutosize
          autoFocus
          value={current.t.value}
          onChange={({ currentTarget: { value } }) => {
            updateDraft(locale, {
              t: { ...current.t, value: multiline ? value : value.replace(NL, '') }
            })
          }}
          onKeyPress={e => {
            if (e.key === 'Enter' && (e.altKey)) {
              save()
            }
            if (e.key === 'Enter' && !multiline) {
              e.preventDefault()
            }
          }}
          className={`mt-3 block w-full text-sm sm:text-base ${textInputClass()}`}
          style={{ maxHeight: '50vh' }}
        />
      </>}

      <div className="mt-3 flex justify-end">
        <Button
          title={
            dirty ? "Discard" :
            update.data ? "Done" :
            "Close"
          }
          color="secondary"
          onClick={() => {
            if (dirty && !confirm(`Are you sure? You have unsaved changes.`)) {
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
          onClick={save}
          disabled={!dirty}
        />
      </div>
    </div>
  ))
}

const NL = /[\n\r]/g

function createDraft(name: string, locale: string, originalValue: string, meta: Draft['t']['meta']): Draft {
  return {
    t: {
      meta,
      name,
      locale,
      value: '',
    },
    originalValue,
  }
}
