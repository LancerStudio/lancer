import m from 'mithril'
import './global'
import { navigation } from './lib/navigation'
import { ToastContainer } from '../lib/toast'
import { cc } from './lib/mithril-helpers'
import { Liminal } from 'mithril-machine-tools'

const DevApp = cc(function() {
  return () => (
    m('.Lancer',
      ToastContainer(),

      navigation.current &&
        m(AnimatedBackdrop,
          m('.fixed.inset-0.bg-black.bg-opacity-40',
            m(AnimatedContent,
              m('.absolute.inset-0.flex.items-center.justify-center.transform.transition-all',
                navigation.current.component({ close: navigation.goBack })
              )
            )
          )
        )
      ,
    )
  )
})

const AnimatedBackdrop = Liminal({
  entry: "opacity-0".split(' '),
  present: "transform transition duration-300 ease-out opacity-100".split(' '),
  absent: "transform transition duration-200 ease-in opacity-0".split(' '),
})

const AnimatedContent = Liminal({
  entry: "opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95".split(' '),
  present: "transform transition duration-300 ease-out translate-y-0 scale-100".split(' '),
  absent: "transform transition duration-200 ease-in opacity-0".split(' '),
})


document.addEventListener('DOMContentLoaded', () => {
  const mountPoint = document.createElement('div')
  document.body.appendChild(mountPoint)
  m.mount(mountPoint, DevApp)
}, false)
