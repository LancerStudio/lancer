import { ReactNode, useState, useEffect, useCallback, useLayoutEffect } from 'react'

type Props = {
  show: boolean
  children: ReactNode
  className?: string

  enter?: string
  enterFrom?: string
  enterTo?: string
  leave?: string
  leaveFrom?: string
  leaveTo?: string

  onHide?: () => void
}

type State =
  | 'enter-before'
  | 'enter-go'
  | 'shown'
  | 'leave-before'
  | 'leave-go'
  | 'hidden'

export function EnterExit(props: Props) {
  const { show } = props
  const [state, setState] = useState<State>('hidden')
  const [childrenCache, setChildrenCache] = useState(props.children)
  const shouldRender = state !== 'hidden'

  useLayoutEffect(() => {
    if (show && state === 'hidden') {
      setState('enter-before')
      requestAnimationFrame(() => {
        setState('enter-go')
      })
    }
    else if (!show && state === 'shown') {
      setState('leave-before')
      requestAnimationFrame(() => {
        setState('leave-go')
      })
    }
  }, [state, show])

  useEffect(() => {
    if (show) {
      setChildrenCache(props.children)
    }
  })

  const onAnimationEnd = useCallback(function onAnimationEnd() {
    if (state === 'enter-go') {
      setState('shown')
    }
    else if (state === 'leave-go'){
      setState('hidden')
      props.onHide && props.onHide()
    }
  }, [state, setState])

  // console.log(show, shouldRender ? 'yes' : 'no', state)

  const className = [
     props.className || null,
     (state === 'enter-before') && props.enterFrom || null,
     (state === 'enter-go' || state === 'shown') && props.enterTo || null,
     (state === 'enter-before' || state === 'enter-go' || state === 'shown') && props.enter || null,

     (state === 'leave-before') && props.leaveFrom || null,
     (state === 'leave-go' || state === 'hidden') && props.leaveTo || null,
     (state === 'leave-before' || state === 'leave-go' || state === 'hidden') && props.leave || null,
  ].join(' ')

  return (
    shouldRender ? (
      <div
        className={className}
        onTransitionEnd={onAnimationEnd}
      >
        {!show
          ? childrenCache
          : props.children
        }
      </div>
    ) : null
  )
}