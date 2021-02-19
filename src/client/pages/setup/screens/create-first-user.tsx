import { Rpc } from '../../../dev/lib/rpc-client'
import { usePromise } from '../../../dev/lib/use-promise'
import { SetPasswordForm } from '../../../lib/components/SetPasswordForm'
import { useToasts } from '../../../lib/toast'

type Props = {
  name: string
  email: string
  next: () => void
}
export function CreateFirstUser({ name, email, next }: Props) {
  const { quickToast } = useToasts()
  const create = usePromise(Rpc.createFirstUser, { lingerLoading: true })

  return (
    <div className="px-6 max-w-xs mx-auto w-full FadeInLong">
      <h3 className="pt-1 text-3xl font-header text-gray-800 text-center">
        Account Setup
      </h3>

      <div className="mt-4 max-w-xs">
        <p className="text-center">Nice to meet you, {name.split(' ')[0]}. Please enter a password for your account.</p>

        <div className="mt-8 text-lg w-full">
          <SetPasswordForm
            isLoading={create.isLoading}
            action={async password => {
              const result = await create.call({ name, email, password })
              if (result.type === 'error') {
                quickToast('error', result.data.message)
                create.clearLoading()
              }
              else {
                next()
              }
            }}
          />
        </div>
      </div>
    </div>
  )
}