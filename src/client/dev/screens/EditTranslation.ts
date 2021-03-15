import m from 'mithril'
import Stream from 'mithril/stream'

import LinkSm from "../../lib/icons/LinkSm"
import { ProcParams, ProcResults, Rpc } from "../lib/rpc-client"
import { Editor } from '../../prosemirror/Editor'
import { Loader } from "../components/Loader"
import { Button } from "../components/Button"
import { textInputClass } from "../../lib/ui"
import { LINK_DELIMINATOR } from "../../../shared/constants"
import { shouldPrefixMailto } from "../../../shared/logic"
import { dx } from '../lib/dx'
import { uniques } from '../lib/streams'
import { quickToast } from '../../lib/toast'
import { AutosizeTextarea } from '../components/AutosizeTextarea'
import { cc } from '../lib/mithril-helpers'

type Draft = {
  t: ItemType<ProcParams['updateTranslations']>
  originalValue: string
}
type Conflict = {
  version: number
  value: string
}


type Attrs = {
  name: string
  locale: string
  onClose: () => void
  link?: boolean
  rich?: boolean
  multiline: boolean
}
export const EditTranslation = cc<Attrs>(function(attrs) {
  const { name, locale: initialLocale, link, rich, multiline, onClose } = attrs()
  const meta = {
    link,
    rich,
    multiline,
  }
  let locale = initialLocale
  let loadingLocale$ = Stream(initialLocale)
  let drafts = {} as Record<string, Draft>

  // TODO
  // @ts-ignore
  let conflicts = {} as Record<string, Conflict>

  const req = dx(async () => {
    const loadingLocale = loadingLocale$()
    const [t, locales] = await Promise.all([
      Rpc.getTranslation({ name, locale: loadingLocale }),
      Rpc.getLocales({ name })
    ])
    const local = drafts[loadingLocale]

    if (!local) {
      drafts[loadingLocale] = createDraft(name, loadingLocale, t?.value || '', meta)
    }

    if (t && !local) {
      drafts[loadingLocale] = {
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
      }
    }
    else if (t) {
      conflicts[loadingLocale] = {
        value: t.value,
        version: t.version,
      }
    }

    if (locale !== loadingLocale) {
      locale = loadingLocale
    }
    return { t, locales }
  })

  loadingLocale$.map(uniques).map(() => req.call())

  const update = dx(Rpc.updateTranslations)

  async function save() {
    if (update.loading) return

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

      drafts[resultLocale] = {
        t: current,
        originalValue: current.value,
      }

      if (resultLocale === locale) {
        req.merge({ t: current })
      }

      quickToast('success', `Saved ${resultLocale.toUpperCase()} successfully.`)
      const elems = [...document.querySelectorAll(`[data-t-name="${name}"][data-t-locale="${resultLocale}"]`)]

      elems.forEach(elem => {
        if (link) {
          const parts = current.value.split(LINK_DELIMINATOR)
          elem.setAttribute('href', shouldPrefixMailto(parts[0]!) ? `mailto:${parts[0]}` : parts[0]!)
          elem.innerHTML = parts[1]!
        }
        else {
          elem.innerHTML = current.value
        }
      })
      if (locale === initialLocale && results.every(r => r.type === 'success')) {
        onClose()
      }
    }

    const locales = await Rpc.getLocales({ name })
    req.merge({ locales })
  }


  const wrapLoader = (content: (data: ProcResults['getLocales']) => m.Vnode<any>) => (
    m('.p-6.sm:p-10.sm:m-8.rounded-lg.bg-gray-200.text-gray-800.shadow-xl.w-full.max-w-4xl',
      m('h2.font-header.text-lg.sm:text-2xl',
        "Edit Translation",
        m('span.ml-2.text-xs.text-gray-500', name),
        req.loading && req.data &&
          Loader({ class: "ml-2 text-primary-500 inline-block h-4 w-4" })
        ,
      ),
      req.loading && !req.data
        ? Loader()
        : req.error
        ? m('div', "An error occured.", Button({ title: "Close", onclick: onClose }))
        : content(req.data!.locales)
      ,
    )
  )

  return () => wrapLoader(locales => {
    // We can be confident this is set since wrapLoader() ensures the initial request is complete
    const current = drafts[locale]!
    const dirty = Object.values(drafts).some(draft => draft.t.value !== draft.originalValue)

    const [href, content] = (() => {
      if (link) {
        const parts = current.t.value.split(LINK_DELIMINATOR)
        if (parts.length === 1) return ['', parts[0]!] as const
        return parts as [string, string]
      }
      else {
        return ['', current.t.value] as const
      }
    })()

    return (
      m('.mt-3.sm:mt-4',
        m('.flex.flex-wrap.space-x-1',
          Object.entries(locales).map(([loc, isSet]) =>
            m('div', {
              key: loc,
              className:
                `${
                  loc === locale ? 'bg-gray-800 text-white' :
                  !isSet ? 'cursor-pointer text-red-700' :
                  'cursor-pointer text-gray-700'
                } uppercase flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium`
              ,
              onclick() {
                loadingLocale$(loc)
              }
            }, loc)
          )
        ),

        rich ? [

          m(Editor, {
            content,
            onChange(value) {
              value = link ? `${href}${LINK_DELIMINATOR}${value}` : value
              drafts[locale]!.t = { ...current.t, value }
            },
            class: "mt-4",
            multiline: !!multiline,
          }),

        ] : [

          m(AutosizeTextarea, {
            autoFocus: true,
            value: content,
            oninput({ currentTarget: { value } }: any) {
              value = link ? `${href}${LINK_DELIMINATOR}${value}` : value
              drafts[locale]!.t = { ...current.t, value: multiline ? value : value.replace(NL, '') }
            },
            onkeypress(e: any) {
              if (e.key === 'Enter' && (e.altKey)) {
                save()
              }
              if (e.key === 'Enter' && !multiline) {
                e.preventDefault()
              }
            },
            class: `mt-3 block w-full ${textInputClass()}`,
            style: { maxHeight: '50vh' },
          })
        ],

        link &&
          m('.mt-2.flex.rounded-md.shadow-sm',
            m('span.inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-400 bg-gray-100 text-gray-500 sm:text-sm',
              LinkSm({ class: "w-4 h-4" }),
            ),
            m('input', {
              type: "text",
              placeholder: "https://www.example.com or alice@example.com",
              className: `flex-1 rounded-none rounded-r-md text-sm sm:text-base ${textInputClass({ noRounded: true })}`,
              value: href,
              onchange({ currentTarget: { value } }: any) {
                value = `${value}${LINK_DELIMINATOR}${content}`
                drafts[locale]!.t = { ...current.t, value }
              },
            })
          )
        ,

        m('.mt-3.flex.justify-end',
          Button({
            title:
              dirty ? "Discard" :
              update.data ? "Done" :
              "Close"
            ,
            color: "secondary",
            onclick() {
              if (dirty && !confirm(`Are you sure? You have unsaved changes.`)) {
                return
              }
              onClose()
            },
            disabled: update.loading,
          }),

          Button({
            title: "Save",
            color: "primary",
            class: "ml-3",
            onclick: save,
            disabled: !dirty,
          })
        )
      )
    )
  })
})

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
