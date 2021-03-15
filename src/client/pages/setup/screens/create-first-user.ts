import m from 'mithril'
import { dx } from '../../../dev/lib/dx'
import { cc } from '../../../dev/lib/mithril-helpers'
import { Rpc } from '../../../dev/lib/rpc-client'
import { SetPasswordForm } from '../../../lib/components/SetPasswordForm'
import { quickToast } from '../../../lib/toast'

type Attrs = {
  name: string
  email: string
  next: () => void
}
export const CreateFirstUser = cc<Attrs>(function() {
  const create = dx(Rpc.createFirstUser, { lingerLoading: true })

  return ({ name, email, next }) =>
    m(".px-6.max-w-xs.mx-auto.w-full.FadeInLong",
      m("h2.sm:pt-1.text-3xl.font-header.text-gray-900.text-center",
        "Account Setup"
      ),

      m(".mt-4.sm:mt-6.max-w-xs",
        m('p.text-center', `Nice to meet you, ${name.split(' ')[0]}. Please enter a password for your account.`),

        m(".mt-8.text-lg.w-full",
          m(SetPasswordForm, {
            isLoading: create.loading,
            async action(password) {
              const result = await create.call({ name, email, password })
              if (result.type === 'error') {
                quickToast('error', result.data.message)
                create.clearLoading()
              }
              else {
                next()
              }
            }
          })
        )
      )
    )
})