import m from 'mithril'
import Stream from 'mithril/stream'
import { Welcome } from './screens/welcome'
import { CreateFirstUser } from './screens/create-first-user'
import { CheckCircleSm } from '../../lib/icons/CheckCircleSm'
import { ProcResults, Rpc } from '../../dev/lib/rpc-client'
import { Loader } from '../../dev/components/Loader'
import { CreateOtherUsers } from './screens/create-other-users'
import { Complete } from './screens/complete'
import { dx } from '../../dev/lib/dx'
import { debounce } from '../../dev/lib/util'
import { cc } from '../../dev/lib/mithril-helpers'
import { uniques } from '../../dev/lib/streams'
import { ToastContainer } from '../../lib/toast'

type Status = ProcResults['getOnboardingStatus']

function App() {
  const status = dx(() => Rpc.getOnboardingStatus({}))
  status.call()

  return {
    view: () =>
      m(".min-h-screen",
        ToastContainer(),
        status.loading && !status.data
          ? Loader()
          : m(LoadedApp, { status: status.data!, reloadStatus: async () => { await status.call() }})
        ,
      )
  }
}

m.mount((window as any).app, App)



type Step = typeof steps[0]
type SetupScreen = typeof steps[0]['name']

const steps = [
  { name: 'Welcome' as const, title: 'Welcome', index: 0 },
  { name: 'CreateFirstUser' as const, title: 'Account Setup', index: 1 },
  { name: 'CreateOtherUsers' as const, title: 'Additional Users', index: 2 },
]

const LoadedApp = cc<{ status: Status, reloadStatus: () => Promise<void> }>(function(attrs) {
  let name = ''
  let email = ''
  let stepName$ = Stream<SetupScreen | 'complete'>(
    attrs().status.self ? 'CreateOtherUsers' : 'Welcome'
  )

  const step$ = stepName$.map(stepName => steps.find(s => s.name === stepName) || null)

  const width$ = Stream(window.innerWidth)
  const handleResize = debounce(() => { width$(window.innerWidth) }, 300)
  this.addEventListener(window, 'resize', handleResize)

  const sm$ = width$.map(w => w >= 640)
  const side$ = Stream<number>()
  const main$ = Stream<number>()
  const mode$ = Stream<'short' | 'tall' | null>(null)
  const isTallerStep$ = step$.map(s => s?.index === 2)

  let sideTop = 0
  let mainTopTall = 0

  Stream.lift((isTallerStep, side: number, main: number, _1: any, _2: any) => {
    // Sidebar should be stable after page load; only set it once
    if (side && !sideTop) {
      sideTop = side
    }
    // Tall steps should be set every time they occur.
    if (main && isTallerStep) {
      mainTopTall = main
    }
    else if (!isTallerStep) {
      mainTopTall = 0
    }

    m.redraw()
  }, isTallerStep$, side$.map(uniques()), main$.map(uniques()), sm$, mode$.map(uniques()))

  function readBounds() {
    side$( document.querySelector('.SetupSidebar')?.getBoundingClientRect().top || side$() )
    main$( document.querySelector('.SetupMain')?.getBoundingClientRect().top || main$() )
    mode$(isTallerStep$() ? 'tall' : 'short')
  }

  this.oncreate(readBounds)
  this.onupdate(readBounds)

  return () => {
    const { status, reloadStatus } = attrs()
    const sm = sm$()
    const mode = mode$()
    const step = step$()
    const isTallerStep = isTallerStep$()
    const isTransitioning = mode === null || mode === 'short' && isTallerStep || mode === 'tall' && !isTallerStep
    const mainTop = mode === 'tall' ? mainTopTall : sideTop

    return m(`.SetupContainer.py-12.sm:py-0.sm:flex.min-h-screen.justify-center.FadeInLong${sm && isTransitioning ? '.items-center' : ''}`,
      m(`.sm:flex.${sm && mode === null ? '.h-screen.items-center' : ''}`,
        m(`.SetupSidebar.flex.justify-center`, {
          style: { paddingTop: sm && sideTop ? `${sideTop}px` : undefined }
        },
          m(".sm:pb-24",
            m(".flex.justify-center.relative",
              m('img.h-24.relative', { src: "/lancer/logo-icon.svg", style: { left: '-0.2rem' } }),
            ),
            m("h2.mt-3.pb-0.5.flex.items-center.font-header-alt.font-bold.text-4xl.text-gray-900.text-center",
              m("span", 'Lancer')
            ),
            Steps({ current: step, class: "mt-6 pl-0.5" }),
          )
        ),

        m(`.SetupMain.mt-10.sm:mt-0.sm:ml-16.pb-8`, {
          style: { paddingTop: sm && mainTop && !isTransitioning ? `${mainTop}px` : undefined }
        },
          m('.sm:flex.mb-3.items-end.justify-center',{
            class: step === null && !sm ? 'flex' : 'hidden h-24',
          },
            step === null
              ? CheckCircleSm({ class: ".mb-2.h-16.w-16.text-green-500" })
              : m(".-mb-1.text-white")
          ),

          step === null
          ? m(Complete)

          : step.name === 'Welcome'
          ? m(Welcome, {
              next: (n, e) => { name = n; email = e; stepName$('CreateFirstUser') }
            })

          : step.name === 'CreateFirstUser'
          ? m(CreateFirstUser, {
              name,
              email,
              next: async () => { await reloadStatus(); stepName$('CreateOtherUsers') }
            })

          : step.name === 'CreateOtherUsers'
          ? m(CreateOtherUsers, {
              next: async () => { stepName$('complete') },
              status,
              reloadStatus,
            })

          : `No such screen: ${stepName$()}`
        )
      )
    )
  }
})


function Steps({current, class: className=''}: { current: Step | null, class?: string }) {
  return m('nav.flex.justify-center', {
    class: className,
    'aria-label': "Progress"
  },
    m("ol.space-y-6.w-full",

      steps.map(step =>
        current === null || step.index < current.index ? (
          m('.group', {
            key: step.index,
          },
            m("span.flex.items-start",
              m("span.flex-shrink-0.relative.h-5.w-5.flex.items-center.justify-center",
                CheckCircleSm({ class: "h-full w-full text-gray-800" }),
              ),
              m("span.ml-3.text-sm.font-medium.text-gray-500", step.title),
            ),
          )
        ) : step.index === current.index ? (
          m(".flex.items-start", {
            key: step.index,
            "aria-current": "step"
          },
            m(".flex-shrink-0 h-5 w-5 relative flex items-center justify-center", { 'aria-hidden': 'true' },
              m("span.absolute.h-4.w-4.rounded-full.bg-gray-400.bg-opacity-50"),
              m("span.relative.block.w-2.h-2.bg-gray-800.rounded-full"),
            ),
            m("span.ml-3.text-sm.font-medium.text-gray-900", step.title),
          )
        ) : (
          m(".flex.items-start", {
            key: step.index
          },
            m(".flex-shrink-0.h-5.w-5.relative.flex.items-center.justify-center", { 'aria-hidden': 'true' },
              m(".h-2.w-2.bg-gray-400.rounded-full")
            ),
            m("p.ml-3.text-sm.font-medium.text-gray-500", step.title),
          )
        )
      )
    )
  )
}
