import { useEffect, useRef, useState } from 'react'
import { IconPaperclip, IconSend } from '../assets/icons'

export default function ChatComposer(props: {
  showBranding?: boolean
  brandingHref?: string
  brandingLabel?: string
  onSend: (message: string) => void
}) {
  const { showBranding = false, brandingHref = 'https://example.com', brandingLabel = 'Sample' } = props

  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    const text = value.trim()
    if (!text) return
    props.onSend(text)
    setValue('')
  }

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  return (
    <div className='flex flex-col gap-1.5 border-t border-slate-900/10 bg-white/90 p-2.5 backdrop-blur'>
      <div className='flex items-end gap-2'>
        <label className='pointer-events-auto inline-grid h-9 w-9 cursor-pointer place-items-center rounded-xl bg-slate-900/5 text-slate-900/80 hover:bg-slate-900/10'>
          <input className='sr-only' type='file' multiple />
          <span aria-label='Add attachment'>
            <IconPaperclip />
          </span>
        </label>

        <textarea
          className='pointer-events-auto min-h-9 flex-1 resize-none rounded-xl bg-slate-900/5 px-3 py-1.5 text-[13px] leading-[1.25] tracking-[-0.01em] text-slate-900 outline-none placeholder:text-[12px] placeholder:italic placeholder:text-slate-900/50'
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder='Type a message…'
          rows={1}
          style={{ maxHeight: '120px' }}
          ref={textareaRef}
          onKeyDown={e => {
            // Allow newline with Shift+Enter, send with Enter (WhatsApp-like)
            if (e.key !== 'Enter') return
            if (e.shiftKey) return
            if (e.nativeEvent.isComposing) return
            e.preventDefault()
            handleSend()
          }}
        />

        <button
          className='pointer-events-auto inline-grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-white disabled:cursor-not-allowed disabled:opacity-50'
          type='button'
          disabled={!value.trim()}
          aria-label='Send message'
          onClick={handleSend}>
          <IconSend />
        </button>
      </div>

      {showBranding && (
        <div className='mt-1 select-none px-1 text-[10px] leading-none text-slate-900/45'>
          Powered by{' '}
          <a
            className='text-slate-900/60 hover:text-slate-900/80 hover:underline'
            href={brandingHref}
            target='_blank'
            rel='noreferrer noopener'>
            {brandingLabel}
          </a>
        </div>
      )}
    </div>
  )
}


