import m from 'mithril'
import { Button } from '../../../dev/components/Button'
import { dx } from '../../../dev/lib/dx'
import { cc } from '../../../dev/lib/mithril-helpers'
import { Rpc } from '../../../dev/lib/rpc-client'
import { textInputClass } from '../../../lib/ui'


type Attrs = {
  next: (name: string, email: string) => void
}
export const Welcome = cc<Attrs>(function() {
  let name = ''
  let email = ''
  let clickId = ''
  let hasClient: null | boolean = null

  const setUseCase = dx(Rpc.setUseCase)

  return ({ next }) =>
    m('.flex.flex-col.items-center',
      m("h3.text-3xl.sm:text-4xl.font-header.text-gray-900", "Welcome"),

      m('.mt-4.sm:mt-6.px-6.max-w-xs.w-full',

        hasClient === null && [

          m('div',
            m("p", "It's time to set up Lancer."),
            m("p.mt-4", "Are you building this website for yourself, or for a client?"),
          ),

          Button({
            title: "For a Client",
            color: "primary",
            class: "mt-6 w-full",
            loading: setUseCase.loading && clickId === 'client',
            onclick: async () => {
              if (setUseCase.loading) return
              clickId = 'client'
              await setUseCase.call({ type: 'client' })
              hasClient = true
            }
          }),
          Button({
            title: "For Myself",
            color: "primary",
            class: "mt-6 w-full",
            loading: setUseCase.loading && clickId === 'myself',
            onclick: async () => {
              if (setUseCase.loading) return
              clickId = 'myself'
              await setUseCase.call({ type: 'personal' })
              hasClient = false
            }
          })
        ],

        hasClient === true && [

          m('.FadeInLong',
            m("p", "Lancer supports two types of users:"),
            m("ol.mt-4.list-disc.list-inside.ml-3",
              m("li", "The Developer (technical)"),
              m("li", "The Client (non-technical)"),
            ),
            m("p.mt-4", "Please enter the name and email address of you, the developer:"),
          )
        ],

        hasClient === false && [

          m('.FadeInLong',
            m("p", "Please enter your name and email address:"),
          ),
        ]
      ),


      hasClient !== null && [
        m('form.mt-6.px-6.max-w-xs.w-full', {
          onsubmit(e: any) {
            e.preventDefault()
            if (name && email.match(/.+@.+/)) {
              next(name, email)
            }
          }
        },
          m('div',
            m("label[for=name].sr-only", "Name"),
            m('input', {
              id: "name",
              name: "name",
              type: "text",
              autoComplete: "name",
              required: true,
              class: `rounded-none rounded-t-md ${textInputClass({ noBorder: true, noRounded: true })}`,
              placeholder: "Name",
              value: name,
              onchange(e: any){ name = e.currentTarget.value },
            })
          ),

          m('div',
            m("label[for=email].sr-only", "Email Address"),
            m('input', {
              id: "email",
              name: "email",
              type: "text",
              autoComplete: "email",
              required: true,
              class: `rounded-none rounded-b-md ${textInputClass({ noBorder: true, noRounded: true })}`,
              placeholder: "you@example.com",
              value: email,
              onchange(e: any){ email = e.currentTarget.value },
            })
          ),

          Button({
            title: "Next",
            color: "primary",
            class: "mt-6 w-full",
            formSubmit: true,
          })
        )
      ]
    )
})