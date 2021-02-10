import { useState } from "react"
import { Button } from "../../../dev/components/Button"
import { Rpc } from "../../../dev/lib/rpc-client"
import { usePromise } from "../../../dev/lib/use-promise"
import { useToasts } from "../../../lib/toast"
import { textInputClass } from "../../../lib/ui"

export function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { quickToast } = useToasts()

  const info = usePromise(Rpc.getSiteInfo, { invoke: true })
  const signIn = usePromise(Rpc.signIn, { lingerLoading: true })

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

  return (
    <div className="min-h-screen flex flex-col justify-center py-8 sm:px-6 lg:px-8 md:pb-16">
      <div className="px-6 max-w-md mx-auto w-full">
        <div className="flex flex-col items-center">
          <img src="/lancer/logo-icon.svg" className="h-24" />

          <h2 className="mt-1.5 font-header-alt font-bold text-6xl text-gray-900 text-center">
            Lancer
          </h2>

          <h3 className="mt-1 text-lg font-light">{info.isLoading ? '\u00a0' : info.data?.name}</h3>
        </div>

        <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
          <form
            className="space-y-6"
            method="POST"
            onSubmit={e => {
              e.preventDefault()
              submit()
            }}
          >
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email" className="sr-only">Email Address</label>
                <input
                  id="email"
                  name="email"
                  autoComplete="email"
                  required
                  className={`rounded-none rounded-t-md ${textInputClass({ noRounded: true })}`}
                  placeholder="Email Address"
                  value={email}
                  onChange={e => setEmail(e.currentTarget.value)}
                />
              </div>
              <div className="border-t">
                <label htmlFor="password" className="sr-only">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="Password"
                  className={`rounded-none rounded-b-md ${textInputClass({ noRounded: true })}`}
                  // className="bg-gray-50 appearance-none rounded-none relative block w-full px-3 py-2 border-none placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-gray-600 focus:border-gray-600 focus:z-10"
                  value={password}
                  onChange={e => setPassword(e.currentTarget.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input type="hidden" name="remember" value="true" />
                <input
                  id="remember_me"
                  name="remember_me"
                  type="checkbox"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="remember_me" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-gray-900 hover:text-indigo-500">
                  Forgot password?
                </a>
              </div>
            </div>

            <div>
              <Button
                title="Sign in"
                color="primary"
                className="w-full"
                loading={signIn.isLoading}
                formSubmit
              />
            </div>
          </form>
        </div>

      </div>
    </div>
  )
}
