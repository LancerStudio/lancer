import m from 'mithril'
import { Liminal } from 'mithril-machine-tools'
import owasp from 'owasp-password-strength-test'
import { Button } from '../../dev/components/Button'
import { cc } from '../../dev/lib/mithril-helpers'
import { CheckCircleSm } from '../icons/CheckCircleSm'
import { textInputClass } from '../ui'

const PASSWORD_STRENGTH_COLORS = [
  ['bg-gray-400', 'bg-gray-400', 'bg-gray-400', 'bg-gray-400'],
  ['bg-red-400', 'bg-gray-400', 'bg-gray-400', 'bg-gray-400'],
  ['bg-red-400', 'bg-red-400', 'bg-gray-400', 'bg-gray-400'],
  ['bg-yellow-500', 'bg-yellow-500', 'bg-yellow-500', 'bg-gray-400'],
  ['bg-green-400', 'bg-green-400', 'bg-green-400', 'bg-green-400'],
]

type Attrs = {
  action: (password: string) => void
  isLoading: boolean
  class?: string
}
export const SetPasswordForm = cc<Attrs>(function() {
  let wantToSubmit = false
  let password = ''
  let passwordConfirm = ''

  let passwordError = false
  let passwordConfirmError = false

  return ({ isLoading, action, class: className }) => {
    const test = owasp.test(password)
    const passwordStrengthColors = PASSWORD_STRENGTH_COLORS[
      test.strong ? 4 :
      Math.min(test.passedTests.length - 2, test.requiredTestErrors.length ? 3 : 4)
    ]!

    const testError = (!test.strong && password && test.requiredTestErrors[0] || '').replace('The password', 'Password')

    const cannotSubmit = !password || !passwordConfirm || passwordError || passwordConfirmError

    const onPasswordBlur = () => passwordError = !!testError
    const onPasswordConfirmBlur = () => passwordConfirmError = password !== passwordConfirm

    return m("form", {
      className,
      onsubmit(e: any) {
        e.preventDefault()
        // Trigger blur effets for error detection
        onPasswordBlur()
        onPasswordConfirmBlur()
        wantToSubmit = true
      },
      onupdate() {
        if (wantToSubmit && !cannotSubmit && !isLoading) {
          action(password)
          wantToSubmit = false
        }
      },
    },
      m('div',
        m("label[for=password].block.text-sm.font-medium.text-gray-700", "New Password"),
        m(".mt-1.relative.rounded-md.shadow-sm",
          m("input", {
            type: "password",
            name: "password",
            id: "password",
            value: password,
            className: `pr-10 ${textInputClass({ hasError: passwordError, noBorder: true })}`,
            oninput(e: any) {
              password = e.currentTarget.value
              passwordConfirm = ''
              passwordConfirmError = false
            },
            onblur() {
              onPasswordBlur()
            },
            onfocus() {
              passwordError = false
            },
            "aria-invalid": passwordError,
            "aria-describedby": "password-error",
          }),

          password && !testError && [
            m('.absolute.inset-y-0.right-0.pr-3.flex.items-center.pointer-events-none',
              CheckCircleSm({ class: "h-5 w-5 text-green-500" })
            )
          ],
        ),

        m(".relative.mt-2.mx-0.5.flex",
          m(`.flex-1.h-1.${passwordStrengthColors[0]}.rounded-l-sm`),
          m(`.flex-1.h-1.${passwordStrengthColors[1]}.ml-1`),
          m(`.flex-1.h-1.${passwordStrengthColors[2]}.ml-1`),
          m(`.flex-1.h-1.${passwordStrengthColors[3]}.rounded-r-sm.ml-1`),
          m('#password-error.absolute.top-full.left-0.right-0.text-sm.text-red-600.z-20',
            testError &&
            m(Animated,
              m(".mt-1.-mx-2.bg-gray-100.rounded.p-3.z-20.shadow", testError),
            ),
          ),
        ),
      ),

      m('.mt-4',
        m("label[for=password_confirm].block.text-sm.font-medium.text-gray-700", "Confirm Password"),
        m(".mt-1.relative.rounded-md.shadow-sm",
          m("input", {
            type: "password",
            name: "password_confirm",
            id: "password_confirm",
            className: `pr-10 ${textInputClass({ hasError: !!passwordConfirmError, noBorder: true })}`,
            value: passwordConfirm,
            oninput(e: any) {
              passwordConfirm = e.currentTarget.value
              passwordConfirmError = false
            },
            onblur() {
              onPasswordConfirmBlur()
            },
            "aria-invalid": !!passwordConfirmError,
            "aria-describedby": "password-confirm-error",
          }),
          passwordConfirmError && [
            m(".absolute.inset-y-0.right-0.pr-3.flex.items-center.pointer-events-none",
              m("svg", {"class":"h-5 w-5 text-red-500","xmlns":"http://www.w3.org/2000/svg","viewBox":"0 0 20 20","fill":"currentColor","aria-hidden":"true"},
                m("path", {"fill-rule":"evenodd","d":"M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z","clip-rule":"evenodd"})
              )
            )
          ],
        ),
        passwordConfirmError && [
          m('p#password-confirm-error.mt-2.text-sm.text-red-600',
            "Password and password confirm do not match."
          )
        ]
      ),

      Button({
        title: "Set Password",
        color: "primary",
        class: "mt-6 w-full",
        loading: isLoading,
        disabled: cannotSubmit,
        formSubmit: true,
      }),
    )
  }
})


const Animated = Liminal({
  entry: "opacity-0".split(' '),
  present: "transform transition duration-500 ease-out opacity-100".split(' '),
  absent: "transform transition duration-300 ease-in opacity-0".split(' '),
})
