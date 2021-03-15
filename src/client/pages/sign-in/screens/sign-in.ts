import m from 'mithril'
import { Button } from "../../../dev/components/Button"
import { dx } from '../../../dev/lib/dx'
import { cc } from '../../../dev/lib/mithril-helpers'
import { Rpc } from "../../../dev/lib/rpc-client"
import { quickToast } from '../../../lib/toast'
import { textInputClass } from "../../../lib/ui"

export const SignIn = cc(function() {
  let email = ''
  let password = ''

  const info = dx(Rpc.getSiteInfo); info.call({})
  const signIn = dx(Rpc.signIn, { lingerLoading: true })

  async function submit() {
    const result = await signIn.call({ email, password })
    if (result.type === 'success') {
      window.location.href = '/'
    }
    else {
      signIn.clearLoading()
      quickToast('error', result.data.message)
    }
  }

  return () => (
    m('.min-h-screen.flex.flex-col.justify-center.py-8.sm:px-6.lg:px-8.md:pb-16',
      m('.px-6.max-w-md.mx-auto.w-full',
        m('.flex.flex-col.items-center',
          m('img.h-24', { src: "/lancer/logo-icon.svg" }),

          m('h2', { class: "mt-1.5 font-header-alt font-bold text-6xl text-gray-900 text-center" }, "Lancer"),

          m('h3.mt-1.text-lg.font-light', info.loading ? '\u00a0' : info.data?.name),
        ),

        m('.mt-6.sm:mx-auto.sm:w-full.sm:max-w-md',
          m('form.space-y-6', {
            method: 'POST',
            onsubmit(e: any) {
              e.preventDefault()
              submit()
            }
          },
            m('.rounded-md.shadow-sm.-space-y-px',
              m('div',
                m('label[for=email].sr-only', "Email Address"),
                m('input', {
                  id: "email",
                  name: "email",
                  type: "email",
                  autoComplete: "current-password",
                  required: true,
                  placeholder: "Email Address",
                  class: `rounded-none rounded-t-md ${textInputClass({ noRounded: true, noBorder: true })}`,
                  value: email,
                  onchange(e: any) { email = e.currentTarget.value },
                }),
              ),
              m('.border-t',
                m('label[for=password].sr-only', "Password"),
                m('input', {
                  id: "password",
                  name: "password",
                  type: "password",
                  autoComplete: "current-password",
                  required: true,
                  placeholder: "Password",
                  class: `rounded-none rounded-b-md ${textInputClass({ noRounded: true, noBorder: true })}`,
                  value: password,
                  onchange(e: any) { password = e.currentTarget.value },
                }),
              ),
            ),

            m('.flex.items-center.justify-between',
              m('.flex.items-center',
                m('input[type=hidden][name=remember][value=true]'),
                m('input', {
                  id: "remember_me",
                  name: "remember_me",
                  type: "checkbox",
                  class: "h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded",
                }),
                m('label[for=remember_me].ml-2.block.text-sm.text-gray-900', "Remember me"),
              ),

              m('.text-sm',
                m('a[href=#].font-medium.text-gray-900.hover:text-indigo-500', "Forgot password?")
              ),
            ),

            m('div',
              Button({
                title: "Sign in",
                color: "primary",
                class: "w-full",
                loading: signIn.loading,
                formSubmit: true
              }),
            ),
          ),
        ),

      )
    )
  )
})
