import { useEffect, useRef, useState } from 'react'
import { IconPaperclip, IconSend } from '../assets/icons'

//When the form is shown the text area and the send button will be disabled...
export default function ChatComposer(props: {
  onSend: (message: string) => void
  showFormCapture: boolean
}) {

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
    el.style.height = value.trim() ? `${el.scrollHeight}px` : '36px'
  }, [value])

  return (
    <div className='flex flex-col gap-1.5 border-t border-slate-900/10 bg-white/90 p-2.5 backdrop-blur'>
      <div className='flex items-end gap-2'>
        <label className='pointer-events-auto inline-grid h-9 w-9 cursor-pointer place-items-center rounded-xl bg-slate-900/5 text-slate-900/80 hover:bg-slate-900/10'>
          <input className='sr-only' type='file' multiple disabled={props.showFormCapture} />
          <span aria-label='Add attachment'>
            <IconPaperclip />
          </span>
        </label>

        <textarea
          title={props.showFormCapture ? 'Please fill in the form to continue the conversation' : 'Type a message…'}
          disabled={props.showFormCapture}
          className='pointer-events-auto h-9 min-h-9 flex-1 resize-none rounded-xl bg-slate-900/5 px-3 py-2 text-[13px] leading-5 tracking-[-0.01em] text-slate-900 outline-none placeholder:text-[13px] placeholder:italic placeholder:text-slate-900/50'
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
          disabled={!value.trim() || props.showFormCapture}
          aria-label='Send message'
          onClick={handleSend}>
          <IconSend />
        </button>
      </div>
    </div>
  )
}


