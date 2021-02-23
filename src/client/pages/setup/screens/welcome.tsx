import React, { useState } from 'react'
import { Button } from '../../../dev/components/Button'
import { Rpc } from '../../../dev/lib/rpc-client'
import { usePromise } from '../../../dev/lib/use-promise'
import { textInputClass } from '../../../lib/ui'


type Props = {
  next: (name: string, email: string) => void
}
export function Welcome({ next }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [clickId, setClickId] = useState('')
  const [hasClient, setHasClient] = useState<null | boolean>(null)

  const setUseCase = usePromise(Rpc.setUseCase)

  return (
    <div className="flex flex-col items-center">
      <h3 className="text-3xl sm:text-4xl font-header text-gray-900">
        Welcome
      </h3>

      <div className="mt-4 sm:mt-6 px-6 max-w-xs w-full">

        {hasClient === null && <>

          <div className="">
            <p>It's time to set up Lancer.</p>
            <p className="mt-4">Are you building this website for yourself, or for a client?</p>
          </div>

          <Button
            title="For a Client"
            color="primary"
            className="mt-6 w-full"
            loading={setUseCase.isLoading && clickId === 'client'}
            onClick={async () => {
              if (setUseCase.isLoading) return
              setClickId('client')
              await setUseCase.call({ type: 'client' })
              setHasClient(true)
            }}
          />
          <Button
            title="For Myself"
            color="primary"
            className="mt-6 w-full"
            loading={setUseCase.isLoading && clickId === 'myself'}
            onClick={async () => {
              if (setUseCase.isLoading) return
              setClickId('myself')
              await setUseCase.call({ type: 'personal' })
              setHasClient(false)
            }}
          />
        </>}

        {hasClient === true && <>

          <div className="FadeInLong">
            <p>Lancer supports two types of users:</p>
            <ol className="mt-4 list-disc list-inside ml-3">
              <li>The Developer (technical)</li>
              <li>The Client (non-technical)</li>
            </ol>
            <p className="mt-4">Please enter the name and email address of you, the developer:</p>
          </div>
        </>}

        {hasClient === false && <>

          <div className="FadeInLong">
            <p>Please enter your name and email address:</p>
          </div>
        </>}
      </div>


      {hasClient !== null &&
        <form
          className="mt-6 px-6 max-w-xs w-full"
          onSubmit={e => {
            e.preventDefault()
            if (name && email.match(/.+@.+/)) {
              next(name, email)
            }
          }}
        >
          <div>
            <label htmlFor="email" className="sr-only">Name</label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
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

          <Button
            title="Next"
            color="primary"
            className="mt-6 w-full"
            formSubmit
          />
        </form>
      }

    </div>
  )
}