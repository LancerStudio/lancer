import m from 'mithril'
import { ProcParams, ProcResults, Rpc } from '../../../dev/lib/rpc-client'
import { capitalize, copyToClipboard, firstWord } from '../../../dev/lib/util'
import { selectClass, textInputClass } from '../../../lib/ui'
import { Button } from '../../../dev/components/Button'
import { dx } from '../../../dev/lib/dx'
import { cc, fixWidth } from '../../../dev/lib/mithril-helpers'
import { quickToast } from '../../../lib/toast'

type Status = ProcResults['getOnboardingStatus']

type Props = {
  next: () => void
  status: Status
  reloadStatus: () => Promise<void>
}
export const CreateOtherUsers = cc<Props>(function() {
  const temporaryPasswords = {} as Record<string,string>

  return ({ status, reloadStatus, next }) =>
    m('.FadeInLong',
      m('h3.text-3xl.font-header.text-gray-900.text-center', "Additional Users"),

      m('.mt-4.sm:mt-6.px-6.max-w-xs.mx-auto',
        status.use_case === 'client' &&
          m('p.text-center', "Here you can create additional accounts for your client(s) and other developers.")
        ,
        status.use_case === 'personal' &&
          m('p.text-center', "If you have others working on this project, you can add them here.")
        ,
      ),

      m(UserTable, { status, temporaryPasswords, class: "mt-8" }),

      m(NewUserForm, {
        useCase: status.use_case!,
        class: "mt-8 px-6 max-w-xs mx-auto w-full",
        onCreate(id, tempPass) {
          temporaryPasswords[id] = tempPass
          reloadStatus()
        },
      }),

      m(".mt-6.px-6.max-w-xs.mx-auto",
        m("p.mt-6text-center", "You can always add more users later."),

        Button({
          title: "Next",
          color: "primary",
          class: "mt-6 w-full",
          onclick: next,
        }),
      )
    )
})

type UserTableAttrs = {
  class?: string
  status: Status,
  temporaryPasswords: Record<string,string>
}
const UserTable = cc<UserTableAttrs>(function() {
  const showPassword = {} as Record<string, boolean>

  return ({ status, temporaryPasswords, class: className }) =>
    m(`.flex.flex-col`, { class: className },
      m('.-my-2.overflow-x-auto',
        m('.py-2.align-middle.inline-block.min-w-full.md:px-6.lg:px-8',
          m('.overflow-hidden.border-b.border-gray-200.sm:rounded',
            m('table.min-w-full.divide-y.divide-gray-200',
              m('thead',
                m('tr',
                  m('th.px-6.py-3.text-left.text-xs.font-medium.text-gray-600.uppercase.tracking-wider',
                    "Name"
                  ),
                  m('th.px-6.py-3.text-left.text-xs.font-medium.text-gray-600.uppercase.tracking-wider',
                    "Password"
                  ),
                  m('th.px-6.py-3.text-left.text-xs.font-medium.text-gray-600.uppercase.tracking-wider',
                    "Role"
                  ),
                  // m('th.relative.px-6.py-3'),
                )
              ),
              m('tbody.bg-gray-100.bg-opacity-70.divide-y.divide-gray-200',
                status.users.map(user =>
                  m('tr', { key: user.id },
                    m('td.px-6.py-4.whitespace-nowrap',
                      m('.flex.items-center',
                        m('.flex-shrink-0.h-10.w-10',
                          m('img.h-10.w-10.rounded-full', { src: user.gravatar_url, alt: user.name }),
                        ),
                        m('.ml-4',
                          m('.text-sm.font-medium.text-gray-900.w-28.sm:w-auto.overflow-ellipsis.overflow-hidden',
                            user.name,
                          ),
                          m('.text-sm.text-gray-500.w-28.sm:w-auto.overflow-ellipsis.overflow-hidden',
                            user.email,
                          )
                        )
                      )
                    ),
                    m("td.px-6.py-4",
                      user.password_temporary && temporaryPasswords[user.id] ? [
                        m('.text-sm.text-gray-900',
                          m('div', m('b', "Action Required:"), m('br'), `Give this temporary password to ${firstWord(user.name)}:`),
                          m('.mt-0.5.whitespace-nowrap',
                            m('span.font-mono', showPassword[user.id] ? temporaryPasswords[user.id] : '••••••••••'),

                            m('button', {
                              oncreate: fixWidth,
                              onclick() { showPassword[user.id] = !showPassword[user.id] },
                              class: "ml-1 text-sm text-gray-500 underline cursor-pointer",
                            }, showPassword[user.id] ? 'hide' : 'show'),

                            m('button', {
                              onclick() {
                                copyToClipboard(temporaryPasswords[user.id]!)
                                quickToast('success', 'Copied to clipboard')
                              },
                              class: "ml-1 text-sm text-gray-500 underline cursor-pointer",
                            }, "copy")
                          ),
                        ),
                      ] : user.password_temporary ? [
                        m('.text-sm.text-gray-900', 'Temporary')
                      ] : [
                       m('.text-sm.text-gray-900', 'Permanent')
                      ]
                      ,
                    ),
                    m("td.px-6.py-4.whitespace-nowrap.text-sm.text-gray-900",
                      capitalize(user.type),
                    ),
                    // m("td.px-6.py-4.whitespace-nowrap.text-right.text-sm.font-medium",
                    //   m('a[href=#].text-indigo-600.hover:text-indigo-900', "Reset Password"),
                    // )
                  )
                )
              )
            )
          )
        )
      )
    )
})


type UserType = ProcParams['createUser']['type']

type NewUserFormAttrs = {
  useCase: 'personal' | 'client'
  onCreate: (id: number, tempPass: string) => void
  class?: string
}
const NewUserForm = cc<NewUserFormAttrs>(function(attrs) {
  const create = dx(Rpc.createUser)

  let open = attrs().useCase === 'client'
  let type = (attrs().useCase === 'client' ? 'client' : 'dev') as UserType
  let name = ''
  let email = ''

  return ({ useCase, onCreate, class: className }) => (
    !open
    ? m(`.flex.justify-center`, { class: className },
        Button({
          size: "sm",
          block: false,
          title: "New User",
          color: "primary",
          onclick() {
            open = true
          }
        })
      )
    : m('form', {
        async onsubmit(e: any) {
          e.preventDefault()
          if (create.loading) return

          const result = await create.call({ name, email, type })
          if (result.type === 'error') {
            quickToast('error', result.data.message)
          }
          else {
            quickToast('success', 'User created successfully.')
            name = ''
            email = ''
            document.querySelector<HTMLElement>(':focus')?.blur()

            onCreate(result.data.user_id, result.data.temporaryPassword)

            // TODO: Only show this if email is not set up
            setTimeout(() => {
              quickToast('warning', `Don't forget to share their temporary password.`)
            }, 3000)
          }
        },
        class: `${useCase === 'personal' ? 'FadeIn' : ''} ${className}`
      },
        m('h3.font-header.text-2xl.text-center.font-bold.text-gray-800', "New User"),

        m('.mt-6',
          m('label[for=email].sr-only', "Name"),
          m('input', {
            id: "name",
            name: "name",
            type: "text",
            autoComplete: "name",
            autoFocus: useCase === 'personal',
            required: true,
            className: `rounded-none rounded-t-md ${textInputClass({ noBorder: true, noRounded: true })}`,
            placeholder: "Name",
            value: name,
            onchange(e: any) { name = e.currentTarget.value },
          }),
        ),

        m('div',
          m('label[for=email].sr-only', "Email Address"),
          m('input', {
            id: "email",
            name: "email",
            type: "email",
            autoComplete: "email",
            required: true,
            className: `rounded-none rounded-b-md ${textInputClass({ noBorder: true, noRounded: true })}`,
            placeholder: "Email Address",
            value: email,
            onchange(e: any) { email =e.currentTarget.value },
          })
        ),

        m('select', {
          name: "location",
          value: type,
          onchange(e: any) { type = e.currentTarget.value as any },
          className: `mt-6 w-full ${selectClass({ noBorder: true })}`,
        },
          m('option[value=client]', "Client"),
          m('option[value=dev]', "Developer"),
        ),

        Button({
          title: "Create User",
          color: "primary",
          loading: create.loading,
          class: "mt-6 w-full",
          formSubmit: true,
        }),
      )
  )
})
