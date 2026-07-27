import { getMessageMeta } from '../helpers'
import type { ChatMessage } from './types'
import { toHHmm } from './utils/time'

export default function ChatBody(props: { messages: Array<ChatMessage> }) {
  const messagesMeta = getMessageMeta(props.messages)

  return (
    <>
      {messagesMeta.map((message, idx) => {
        const prev = idx > 0 ? messagesMeta[idx - 1] : undefined
        const next = idx < messagesMeta.length - 1 ? messagesMeta[idx + 1] : undefined

        const isContinued = !!prev && prev.side === message.side
        const showAvatar = message.side === 'staff' && message.isLastOfGroup

        const timeText = toHHmm(message.timestamp)
        const nextTimeText = next ? toHHmm(next.timestamp) : undefined
        const showTimestamp = !next || next.side !== message.side || nextTimeText !== timeText

        const bubbleClassName = [
          'chat-bubble-shape',
          // typography + wrapping
          'text-[13px] leading-[1.35] tracking-[-0.01em] whitespace-pre-wrap',
          'overflow-wrap:anywhere break-words',
          // size + padding
          'w-fit max-w-[75%] px-[0.85em] py-[0.28em]',
          // role alignment + colors
          message.side === 'user' ? 'ml-auto bg-sky-600/80 text-white' : 'mr-auto bg-gray-300/80 text-black',
          // tail
          message.isLastOfGroup ? (message.side === 'user' ? 'chat-tail-user' : 'chat-tail-staff') : '',
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <div
            key={message.timestamp}
            className={[
              'flex flex-col',
              isContinued ? 'mt-0.5' : 'mt-1.5',
            ].join(' ')}>
            <div className={bubbleClassName}>{message.content}</div>

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
                  <div className='select-none text-[11px] italic leading-none text-slate-900/45'>{timeText}</div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}


