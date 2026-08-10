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
  name: string
  setEmail: (email: string) => void
  setPhone: (phone: string) => void
  setName: (name: string) => void
  showFormCapture: boolean
}) {
  const { messages, onFormSubmit, email, phone, setEmail, setPhone, showFormCapture, name, setName } = props
  const messagesMeta = getMessageMeta(messages)
  const disableFormSubmit = !email.trim() || !phone.trim() || !name.trim()

  return (
    <div className='flex flex-col gap-0.5 px-2 py-2'>
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
          'text-[13px] leading-[1.45] tracking-[-0.01em]',
          'overflow-wrap:anywhere break-words',
          'w-fit px-[0.9em] py-[0.55em]',
          message.side === 'user'
            ? 'ml-auto max-w-[78%] chat-bubble-user'
            : 'mr-auto max-w-[92%] chat-bubble-staff',
          message.isLastOfGroup ? (message.side === 'user' ? 'chat-tail-user' : 'chat-tail-staff') : '',
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <div
            key={`${message.timestamp}-${idx}`}
            className={[
              'flex flex-col',
              isContinued ? 'mt-0.5' : 'mt-2',
            ].join(' ')}>
            <div
              className={`${bubbleClassName} chat-markdown`}
              dangerouslySetInnerHTML={{ __html: html }}
            />

            {(showAvatar || showTimestamp) && (
              <div
                className={[
                  'mt-1 flex items-center gap-1.5 px-1.5',
                  message.side === 'user' ? 'justify-end' : 'justify-start',
                ].join(' ')}>
                {showAvatar && (
                  <div
                    className='inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-semibold tracking-[-0.02em] text-slate-600 ring-1 ring-slate-900/8 shadow-sm'>
                    {message.initials}
                  </div>
                )}
                {showTimestamp && (
                  <div className='select-none text-[9px] italic leading-none text-slate-500/70'>{timeText}</div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {showFormCapture && (
        <form
          className='mt-3 flex w-full max-w-64 flex-col gap-2 rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-sm'
          onSubmit={event => {
            event.preventDefault()
            onFormSubmit()
          }}>
          <div className='text-[11px] font-medium text-slate-600'>
            Share your details to continue
          </div>
          <label className='sr-only' htmlFor='capture-name'>
            Name
          </label>
          <input
            id='capture-name'
            className='h-9 w-full rounded-xl border border-slate-200/90 bg-slate-50/80 px-3 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100'
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
            className='h-9 w-full rounded-xl border border-slate-200/90 bg-slate-50/80 px-3 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100'
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
            className='h-9 w-full rounded-xl border border-slate-200/90 bg-slate-50/80 px-3 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100'
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
            className='mt-0.5 h-9 self-end rounded-full bg-slate-900 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50'
            disabled={disableFormSubmit}
            type='submit'>
            Submit
          </button>
        </form>
      )}
    </div>
  )
}


