import { getMessageMeta } from '../helpers'
import type { ChatMessage } from './types'
import { toHHmm } from './utils/time'
import DOMPurify from 'dompurify'
import { Marked } from 'marked'

const markdown = new Marked({
  breaks: true,
  gfm: true,
})

function normalizeDefinitionLists(source: string) {
  // Support the Pandoc-style syntax commonly emitted by LLMs:
  // Term
  // : Definition
  return source.replace(
    /^([^\n]+)\n: ([^\n]+)(?=\n|$)/gm,
    '<dl><dt>$1</dt><dd>$2</dd></dl>',
  )
}

function openExternalLinksInNewTab(html: string) {
  return html.replace(/<a\b([^>]*)>/gi, (tag, attributes: string) => {
    const href = attributes.match(/\bhref=(["'])(.*?)\1/i)?.[2]
    if (!href || href.startsWith('#')) return tag

    const cleanAttributes = attributes
      .replace(/\s+target=(["']).*?\1/gi, '')
      .replace(/\s+rel=(["']).*?\1/gi, '')

    return `<a${cleanAttributes} target="_blank" rel="noopener noreferrer">`
  })
}

export default function ChatBody(props: {
  messages: Array<ChatMessage>
  onFormSubmit: () => void
  email: string
  phone: string
  setEmail: (email: string) => void
  setPhone: (phone: string) => void
  showFormCapture: boolean
}) {
  const { messages, onFormSubmit, email, phone, setEmail, setPhone, showFormCapture, name, setName } = props
  const messagesMeta = getMessageMeta(messages)
  const disableFormSubmit = !email.trim() || !phone.trim()

  return (
    <>
      {messagesMeta.map((message, idx) => {
        const prev = idx > 0 ? messagesMeta[idx - 1] : undefined
        const next = idx < messagesMeta.length - 1 ? messagesMeta[idx + 1] : undefined
        const normalized = normalizeDefinitionLists(message.content)
        const rendered = markdown.parse(normalized, { async: false })
        const renderedHtml = typeof rendered === 'string' ? rendered : ''
        const sanitizedHtml = DOMPurify.sanitize(
          renderedHtml
            .replaceAll('<table>', '<div class="chat-table-wrap"><table>')
            .replaceAll('</table>', '</table></div>'),
        )
        const html = openExternalLinksInNewTab(sanitizedHtml)
        const isContinued = !!prev && prev.side === message.side
        const showAvatar = message.side === 'staff' && message.isLastOfGroup

        const timeText = toHHmm(message.timestamp)
        const nextTimeText = next ? toHHmm(next.timestamp) : undefined
        const showTimestamp = !next || next.side !== message.side || nextTimeText !== timeText

        const bubbleClassName = [
          'chat-bubble-shape',
          // typography + wrapping
          'text-[13px] leading-[1.4] tracking-[-0.01em]',
          'overflow-wrap:anywhere break-words',
          // size + padding
          'w-fit px-[0.85em] py-[0.5em]',
          // role alignment + colors
          message.side === 'user'
            ? 'ml-auto max-w-[75%] bg-sky-600/80 text-white'
            : 'mr-auto max-w-[92%] bg-gray-300/80 text-black',
          // tail
          message.isLastOfGroup ? (message.side === 'user' ? 'chat-tail-user' : 'chat-tail-staff') : '',
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <div
            key={`${message.timestamp}-${idx}`}
            className={[
              'flex flex-col',
              isContinued ? 'mt-0.5' : 'mt-1.5',
            ].join(' ')}>
            <div
              className={`${bubbleClassName} chat-markdown`}
              dangerouslySetInnerHTML={{ __html: html }}
            />

            {(showAvatar || showTimestamp) && (
              <div
                className={[
                  'mt-0.5 flex items-center gap-1.5 px-2',
                  message.side === 'user' ? 'justify-end' : 'justify-start',
                ].join(' ')}>
                {showAvatar && (
                  <div
                    className='inline-flex h-4.5 w-4.5 items-center justify-center rounded-full bg-slate-900/10 text-[10px] font-semibold tracking-[-0.02em] text-slate-900/70'>
                    {message.initials}
                  </div>
                )}
                {showTimestamp && (
                  <div className='select-none text-[9px] italic leading-none text-slate-900/45'>{timeText}</div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {showFormCapture && (
        <form
          className='mt-2 flex w-full max-w-60 flex-col gap-2 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm'
          onSubmit={event => {
            event.preventDefault()
            onFormSubmit()
          }}>
          <label className='sr-only' htmlFor='capture-name'>
            Name
          </label>
          <input
            id='capture-email'
            className='h-8 w-full rounded border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100'
            type='text'
            name='name'
            value={name}
            onChange={event => setName(event.target.value)}
            autoComplete='name'
            placeholder='Name'
            required
          />
          <label className='sr-only' htmlFor='capture-email'>
            Email address
          </label>
          <input
            id='capture-email'
            className='h-8 w-full rounded border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100'
            type='email'
            name='email'
            value={email}
            onChange={event => setEmail(event.target.value)}
            autoComplete='email'
            placeholder='Email address'
            required
          />

          <label className='sr-only' htmlFor='capture-phone'>
            Phone number
          </label>
          <input
            id='capture-phone'
            className='h-8 w-full rounded border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100'
            type='tel'
            name='phone'
            value={phone}
            onChange={event => setPhone(event.target.value)}
            autoComplete='tel'
            inputMode='tel'
            placeholder='Phone number'
            required
          />

          <button
            className='h-8 self-end rounded bg-slate-900 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50'
            disabled={disableFormSubmit}
            type='submit'>
            Submit
          </button>
        </form>
      )}
    </>
  )
}


