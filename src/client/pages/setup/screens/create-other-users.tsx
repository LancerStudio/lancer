import { ProcParams, ProcResults, Rpc } from '../../../dev/lib/rpc-client'
import { usePromise } from '../../../dev/lib/use-promise'
import { useToasts } from '../../../lib/toast'
import { capitalize, copyToClipboard, firstWord } from '../../../dev/lib/util'
import { useState } from 'react'
import { selectClass, textInputClass } from '../../../lib/ui'
import { Button } from '../../../dev/components/Button'
import { useKeyValueState } from '../../../dev/lib/hooks'

type Status = ProcResults['getOnboardingStatus']

type Props = {
  next: () => void
  status: Status
  reloadStatus: () => Promise<void>
}
export function CreateOtherUsers({ status, reloadStatus, next }: Props) {
  const [tempPasswords, setTempPassword] = useKeyValueState<string>()
  console.log('passes', tempPasswords)
  return (
    <div className="FadeInLong">
      <h3 className="mt-1 text-3xl font-header text-gray-800 text-center">
        Additional Users
      </h3>

      <div className="mt-4 px-6 max-w-xs mx-auto">
        {status.use_case === 'client' && <>
          <p className="text-center">Here you can create additional accounts for your client(s) and other developers.</p>
        </>}
        {status.use_case === 'personal' && <>
          <p className="text-center">If you have others working on this project, you can add them here.</p>
        </>}
      </div>

      <UserTable status={status} tempPasswords={tempPasswords} className="mt-8" />

      <NewUserForm
        useCase={status.use_case!}
        className="mt-8 px-6 max-w-xs mx-auto w-full"
        onCreate={(id, tempPass) => {
          setTempPassword(id, tempPass)
          reloadStatus()
        }}
      />

      <div className="mt-6 px-6 max-w-xs mx-auto">
        <p className="mt-6 text-center">You can always add more users later.</p>

        <Button
          title="Next"
          color="primary"
          className="mt-6 w-full"
          onClick={next}
        />
      </div>
    </div>
  )
}

function UserTable({ status, className, tempPasswords }: {
  status: Status
  className?: string
  tempPasswords: Record<number, string>
}) {
  const [passOpen, setPassOpen] = useKeyValueState<boolean>()
  const { quickToast } = useToasts()

  return (
    <div className={`flex flex-col ${className || ''}`}>
      <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
          <div className="overflow-hidden border-b border-gray-200 sm:rounded">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Temporary Password
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Role
                  </th>
                  {0 === 1+1 &&
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Edit</span>
                    </th>
                  }
                </tr>
              </thead>
              <tbody className="bg-gray-100 bg-opacity-70 divide-y divide-gray-200">
                {status.users.map(user =>
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <img className="h-10 w-10 rounded-full" src={user.gravatar_url} alt={user.name} />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 w-28 sm:w-auto overflow-ellipsis overflow-hidden">
                            {user.name}
                          </div>
                          <div className="text-sm text-gray-500 w-28 sm:w-auto overflow-ellipsis overflow-hidden">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {
                        user.password_temporary && tempPasswords[user.id] ? <>
                          <div className="text-sm text-gray-900">
                            <div>
                              <b>Action required:</b><br />Give this temporary password to {firstWord(user.name)}:
                            </div>
                            <div className="mt-0.5 whitespace-nowrap">
                              <span className="font-mono">
                                {passOpen[user.id] ? tempPasswords[user.id] : '••••••••••'}
                              </span>
                              <button
                                onClick={() => setPassOpen(user.id, !passOpen[user.id])}
                                className="ml-1 text-sm text-gray-500 underline cursor-pointer"
                              >
                                {passOpen[user.id] ? 'hide' : 'show'}
                              </button>
                              <button
                                onClick={() => {
                                  copyToClipboard(tempPasswords[user.id]!)
                                  quickToast('success', 'Copied to clipboard')
                                }}
                                className="ml-1 text-sm text-gray-500 underline cursor-pointer"
                              >
                                copy
                              </button>
                            </div>
                          </div>

                        </> : user.password_temporary ? <>
                          <div className="text-sm text-gray-900">
                            Yes
                          </div>

                        </> : <>
                          <div className="text-sm text-gray-900">No</div>
                        </>
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {capitalize(user.type)}
                    </td>
                    {0 === 1+1 &&
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <a href="#" className="text-indigo-600 hover:text-indigo-900">Reset Password</a>
                      </td>
                    }
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}


type UserType = ProcParams['createUser']['type']

function NewUserForm({ onCreate, useCase, className }: {
  useCase: 'personal' | 'client'
  onCreate: (id: number, tempPass: string) => void
  className?: string
}) {
  const { quickToast } = useToasts()
  const create = usePromise(Rpc.createUser)

  const [open, setOpen] = useState(useCase === 'client')
  const [type, setType] = useState<UserType>(useCase === 'client' ? 'client' : 'dev')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  if (!open) {
    return (
      <div className={`flex justify-center ${className}`}>
        <Button
          size="sm"
          block={false}
          title="New User"
          color="primary"
          onClick={() => {
            setOpen(true)
          }}
        />
      </div>
    )
  }

  return (
    <form
      onSubmit={async e => {
        e.preventDefault()
        if (create.isLoading) return

        const result = await create.call({ name, email, type })
        if (result.type === 'error') {
          quickToast('error', result.data.message)
        }
        else {
          quickToast('success', 'User created successfully.')
          setName('')
          setEmail('')
          document.querySelector<HTMLElement>(':focus')?.blur()

          onCreate(result.data.user_id, result.data.temporaryPassword)

          setTimeout(() => {
            quickToast('warning', `Don't forget to share their temporary password.`)
          }, 3000)
        }
      }}
      className={`${useCase === 'personal' ? 'FadeIn' : ''} ${className}`}
    >
      <h3 className="font-header text-2xl text-center font-bold text-gray-800">New User</h3>

      <div className="mt-6">
        <label htmlFor="email" className="sr-only">Name</label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          autoFocus={useCase === 'personal'}
          required
          className={`rounded-none rounded-t-md ${textInputClass({ noBorder: true, noRounded: true })}`}
          placeholder="Name"
          value={name}
          onChange={e => setName(e.currentTarget.value)}
        />
      </div>

      <div>
        <label htmlFor="email" className="sr-only">Email Address</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={`rounded-none rounded-b-md ${textInputClass({ noBorder: true, noRounded: true })}`}
          placeholder="Email Address"
          value={email}
          onChange={e => setEmail(e.currentTarget.value)}
        />
      </div>

      <select
        name="location"
        value={type}
        onChange={e => setType(e.currentTarget.value as any)}
        className={`mt-6 w-full ${selectClass({ noBorder: true })}`}
      >
        <option value="client">Client</option>
        <option value="dev">Developer</option>
      </select>

      <Button
        title="Create User"
        color="primary"
        loading={create.isLoading}
        className="mt-6 w-full"
        formSubmit
      />
    </form>
  )
}
