import owasp from 'owasp-password-strength-test'
import { useEffect, useState } from 'react'
import { Button } from '../../../dev/components/Button'
import { EnterExit } from '../../../dev/components/EnterExit'
import { Rpc } from '../../../dev/lib/rpc-client'
import { usePromise } from '../../../dev/lib/use-promise'
import CheckCircleSm from '../../../lib/icons/CheckCircleSm'
import { useToasts } from '../../../lib/toast'
import { textInputClass } from '../../../lib/ui'

export function UpdateTempPass() {
  const [wantToSubmit, setWantToSubmit] = useState(false)
  const { quickToast } = useToasts()

  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const onPasswordBlur = () => setPasswordError(!!testError)

  const [passwordError, setPasswordError] = useState(false)
  const [passwordConfirmError, setPasswordConfirmError] = useState(false)
  const onPasswordConfirmBlur = () => setPasswordConfirmError(password !== passwordConfirm)

  const test = owasp.test(password)
  const passwordStrengthColors = [
    ['bg-gray-400', 'bg-gray-400', 'bg-gray-400', 'bg-gray-400'],
    ['bg-red-400', 'bg-gray-400', 'bg-gray-400', 'bg-gray-400'],
    ['bg-red-400', 'bg-red-400', 'bg-gray-400', 'bg-gray-400'],
    ['bg-yellow-500', 'bg-yellow-500', 'bg-yellow-500', 'bg-gray-400'],
    ['bg-green-400', 'bg-green-400', 'bg-green-400', 'bg-green-400'],
  ][
    test.strong ? 4 :
    Math.min(test.passedTests.length - 2, test.requiredTestErrors.length ? 3 : 4)
  ]!

  const testError = (!test.strong && password && test.requiredTestErrors[0] || '').replace('The password', 'Password')


  const update = usePromise(Rpc.updatePassword, { lingerLoading: true })

  async function submit() {
    if (cannotSubmit || update.isLoading) return

    const result = await update.call({ newPassword: password })
    quickToast('success', 'Password set successfully')
    setTimeout(() => {
      window.location.href = result.data.returnTo
    }, 1200)
  }
  useEffect(() => {
    if (wantToSubmit) {
      setWantToSubmit(false)
      submit()
    }
  }, [wantToSubmit])

  const cannotSubmit = !password || !passwordConfirm || passwordError || passwordConfirmError

  return (
    <div className="min-h-screen flex flex-col justify-center py-8 sm:px-6 lg:px-8 md:pb-16">
      <form
        className="px-6 max-w-sm mx-auto w-full"
        onSubmit={(e) => {
          e.preventDefault()
          // Trigger blur effets for error detection
          onPasswordBlur()
          onPasswordConfirmBlur()
          setWantToSubmit(true)
        }}
      >

        <div className="flex flex-col items-center">
          <img src="/lancer/logo-icon.svg" className="h-24" />

          <h1 className="mt-3 font-header font-bold text-4xl text-gray-900 text-center">
            Set Password
          </h1>

          <p className="mt-2 font-light text-center">
            You just used a temporary password. Please enter a permanent password to continue.
          </p>
        </div>

        <div className="mt-6">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">New Password</label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <input
              type="password"
              name="password"
              id="password"
              className={`pr-10 ${textInputClass({ hasError: passwordError })}`}
              aria-invalid={passwordError}
              aria-describedby="password-error"
              value={password}
              onChange={e => {
                setPassword(e.currentTarget.value)
                setPasswordConfirm('')
                setPasswordConfirmError(false)
              }}
              onBlur={() => {
                onPasswordBlur()
              }}
              onFocus={() => {
                setPasswordError(false)
              }}
            />

            {password && !testError &&
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <CheckCircleSm className="h-5 w-5 text-green-500" />
              </div>
            }
          </div>
          <div className="relative mt-2 mx-0.5 flex">
            <div className={`flex-1 h-1 ${passwordStrengthColors[0]} rounded-l-sm`}></div>
            <div className={`flex-1 h-1 ${passwordStrengthColors[1]} ml-1`}></div>
            <div className={`flex-1 h-1 ${passwordStrengthColors[2]} ml-1`}></div>
            <div className={`flex-1 h-1 ${passwordStrengthColors[3]} rounded-r-sm ml-1`}></div>
            <div className="absolute top-full left-0 right-0 text-sm text-red-600 z-20" id="password-error">
              <EnterExit
                show={!!testError}
                enter="transition-opacity duration-500"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="transition-opacity duration-300"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="mt-1 -mx-2 bg-gray-100 rounded p-3 z-20 shadow">{testError}</div>
              </EnterExit>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="password_confirm" className="block text-sm font-medium text-gray-700">Confirm Password</label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <input
              type="password"
              name="password_confirm"
              id="password_confirm"
              className={`pr-10 ${textInputClass({ hasError: !!passwordConfirmError })}`}
              aria-invalid={!!passwordConfirmError}
              aria-describedby="password-confirm-error"
              value={passwordConfirm}
              onChange={e => {
                setPasswordConfirm(e.currentTarget.value)
                setPasswordConfirmError(false)
              }}
              onBlur={() => {
                onPasswordConfirmBlur()
              }}
            />
            {passwordConfirmError &&
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            }
          </div>
          {passwordConfirmError &&
            <p className="mt-2 text-sm text-red-600" id="password-confirm-error">
              Password and password confirm do not match.
            </p>
          }
        </div>

        <Button
          title="Set Password"
          color="primary"
          className="mt-6 w-full"
          loading={update.isLoading}
          disabled={cannotSubmit}
          formSubmit
        />
      </form>
    </div>
  )
}