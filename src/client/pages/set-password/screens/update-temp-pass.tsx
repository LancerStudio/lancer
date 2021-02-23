import React from 'react'
import { Rpc } from "../../../dev/lib/rpc-client"
import { usePromise } from "../../../dev/lib/use-promise"
import { SetPasswordForm } from "../../../lib/components/SetPasswordForm"
import { useToasts } from "../../../lib/toast"

export function UpdateTempPass() {
  const { quickToast } = useToasts()
  const update = usePromise(Rpc.updatePassword, { lingerLoading: true })

  return (
    <div className="min-h-screen flex flex-col justify-center py-8 sm:px-6 lg:px-8 md:pb-16">
      <div className="px-6 max-w-sm mx-auto w-full">
        <div className="flex flex-col items-center">
          <img src="/lancer/logo-icon.svg" className="h-20" />

          <h1 className="mt-3 font-header font-bold text-4xl text-gray-900 text-center">
            Set Password
          </h1>

          <p className="mt-2 font-light text-center">
            You just used a temporary password. Please enter a permanent password to continue.
          </p>
        </div>

        <SetPasswordForm
          className="mt-6"
          isLoading={update.isLoading}
          action={async password => {
            const result = await update.call({ newPassword: password })
            quickToast('success', 'Password set successfully')
            setTimeout(() => {
              window.location.href = result.data.returnTo
            }, 1200)
          }}
        />
      </div>
    </div>
  )
}