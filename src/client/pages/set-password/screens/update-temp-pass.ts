import m from 'mithril'
import { dx } from '../../../dev/lib/dx'
import { cc } from '../../../dev/lib/mithril-helpers'
import { Rpc } from "../../../dev/lib/rpc-client"
import { SetPasswordForm } from "../../../lib/components/SetPasswordForm"
import { quickToast } from '../../../lib/toast'

export const UpdateTempPass = cc(function() {
  const update = dx(Rpc.updatePassword, { lingerLoading: true })

  return () => (
    m('.min-h-screen.flex.flex-col.justify-center.py-8.sm:px-6.lg:px-8.md:pb-16',
      m('.px-6.max-w-sm.mx-auto.w-full',
        m('.flex.flex-col.items-center',
          m('img.h-20', { src: '/lancer/logo-icon.svg' }),

          m('h1.mt-3.font-header.font-bold.text-4xl.text-gray-900.text-center', "Set Password"),

          m('p.mt-2.font-light.text-center',
            "You just used a temporary password. Please enter a permanent password to continue.",
          ),
        ),

        m(SetPasswordForm, {
          class: "mt-6",
          isLoading: update.loading,
          async action(password) {
            const result = await update.call({ newPassword: password })
            quickToast('success', 'Password set successfully')
            setTimeout(() => {
              window.location.href = result.data.returnTo
            }, 1200)
          }
        }),
      ),
    )
  )
})