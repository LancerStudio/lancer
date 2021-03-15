import m from 'mithril'
import { Button } from '../../../dev/components/Button'
import { dx } from '../../../dev/lib/dx'
import { cc } from '../../../dev/lib/mithril-helpers'
import { Rpc } from '../../../dev/lib/rpc-client'

export const Complete = cc(function() {
  const markComplete = dx(Rpc.markOnboardingComplete, { lingerLoading: true })

  return () => (
    m(".flex.flex-col.items-center.FadeInLong",

      m("h3.sm:pt-1.text-3xl.font-header.text-gray-800", "Setup Complete"),

      m(".mt-4.sm:mt-6.px-6.max-w-xs.mx-auto.text-center",
        m("p", "You're all set up. May your work be filled with success.")
      ),

      m(".mt-4.px-6.max-w-xs.mx-auto.w-full",
        Button({
          class: 'w-full',
          title: "Conclude",
          color: "primary",
          loading:  markComplete.loading,
          async onclick() {
            await markComplete.call({})
            window.location.href = '/'
          }
        })
      )
    )
  )
})
