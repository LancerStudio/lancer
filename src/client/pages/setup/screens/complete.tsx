import { Button } from '../../../dev/components/Button'
import { Rpc } from '../../../dev/lib/rpc-client'
import { usePromise } from '../../../dev/lib/use-promise'

export function Complete() {
  const markComplete = usePromise(Rpc.markOnboardingComplete, { lingerLoading: true })

  return (
    <div className="flex flex-col items-center FadeInLong">
      <h3 className="sm:pt-1 text-3xl font-header text-gray-800">
        Setup Complete
      </h3>

      <div className="mt-4 sm:mt-6 px-6 max-w-xs mx-auto text-center">
        <p>You're all set up. May your work be filled with success.</p>
      </div>

      <div className="mt-4 px-6 max-w-xs mx-auto w-full">
        <Button
          title="Conclude"
          color="primary"
          className="w-full"
          loading={markComplete.isLoading}
          onClick={async () => {
            await markComplete.call({})
            window.location.href = '/'
          }}
        />
      </div>
    </div>
  )
}
