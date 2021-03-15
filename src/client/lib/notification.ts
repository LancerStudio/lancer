import m, { Vnode } from 'mithril'
import { Static } from 'mithril-machine-tools'
import { cc } from '../dev/lib/mithril-helpers'


export type Props = {
  type: 'success' | 'warning' | 'error'
  title: string
  body?: Vnode<any> | ((close: () => void) => Vnode<any>)
  closeToast: () => void
}
export const Notification = cc<Props>(function() {

  return ({ type, title, body, closeToast }) =>
    m('.p-4.m-2.max-w-sm.w-full.bg-gray-100.shadow-lg.rounded-lg.pointer-events-auto.ring-1.ring-black.ring-opacity-5.overflow-hidden',
      m('.flex.items-start',
        m('.flex-shrink-0',
          type === 'warning' && m(Static, m.trust(`
            <svg class="h-6 w-6 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
          `)),
          type === 'success' && m(Static, m.trust(`
            <svg class="h-6 w-6 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          `)),
          type === 'error' && m(Static, m.trust(`
            <svg class="h-6 w-6 text-red-500"  xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          `)),
        ),
        m('.ml-3.w-0.flex-1',
          m('p.font-medium.text-gray-900',
            title
          ),
          body && m('.mt-1.5.text-sm.text-gray-500',
            typeof body === 'function' ? body(closeToast) : body
          ),
        ),
        m('.mt-0.5.ml-4.flex-shrink-0.flex',
          m('button', {
            onclick: closeToast,
            className: "rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500",
          },
            m('.sr-only', "Close"),
            m(Static, m.trust(`
              <svg class="h-5 w-5" x-description="Heroicon name: x" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
              </svg>
            `)),
          )
        ),
      )
    )
})
