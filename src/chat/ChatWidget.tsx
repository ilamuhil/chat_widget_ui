import { useCallback, useEffect, useRef, useState } from 'react'
import ChatImage from '../assets/chat.png'
import { IconClose, IconEmail, IconFullscreen } from '../assets/icons'
import useIsMobile from '../hooks/useIsMobile'
import ChatBody from './ChatBody'
import ChatComposer from './ChatComposer'
import TypingIndicator from './TypingIndicator'
import './styles/custom.css'
import { useChatSession } from './hooks/useChatSession'
import { useChatSocket } from './hooks/useChatSocket'
import { useChatMessages } from './hooks/useChatMessages'
import { ConnectionStatus } from './components/ConnectionStatus'
import { type FileMessage, type FormCaptureData, type ServerErrorEvent } from './types'
import { InfoBanner, type BannerMessage } from './components/InfoBanner'

const MOBILE_MAX_WIDTH_PX = 768
const CLOSE_ANIMATION_MS = 320
const SUPPORT_TITLE = 'Support'
const SUPPORT_META = 'Typically replies in ~5 min'
const SUPPORT_EMAIL_HREF = 'mailto:support@example.com'
const FORM_CAPTURED_KEY = 'form_data'
const FORM_CAPTURED_VALUE = 'captured'

type WidgetProps = {
  api_key: string
  bot_id: string
}

export default function ChatWidget(props: WidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [closingFullscreen, setClosingFullscreen] = useState(false)
  const [bannerMessage, setBannerMessage] = useState<BannerMessage>({
    content: null,
    variant: 'info',
  })
  const isOnline = true

  const isMobile = useIsMobile(MOBILE_MAX_WIDTH_PX)
  const effectiveFullscreen = isMobile ? isOpen : isFullscreen
  const layoutFullscreen = effectiveFullscreen || closingFullscreen

  const { token, conversationId, isAuthenticating, authFailed, clearSession, ensureSession } = useChatSession({
    api_key: props.api_key,
    bot_id: props.bot_id,
  })

  const [showFormCapture, setShowFormCapture] = useState(
    () =>
      typeof window !== 'undefined' &&
      localStorage.getItem(FORM_CAPTURED_KEY) !== FORM_CAPTURED_VALUE,
  )



  const toggleFormVisibility = useCallback((show: boolean = false) => {
    setShowFormCapture(show)
    if (show) {
      localStorage.setItem(FORM_CAPTURED_KEY, FORM_CAPTURED_VALUE)
    } else {
      localStorage.removeItem(FORM_CAPTURED_KEY)
    }
  }, [])

  const { messages, isTyping, appendUserMessage, clearMessages, handleServerJson, clearTyping, setSender } =
    useChatMessages({ toggleFormVisibility })

  // useChatSocket owns disconnect, so route it through a ref to keep the two
  // hooks independent of each other.
  const disconnectRef = useRef<() => void>(() => {})

  const onServerMessage = useCallback(
    (payload: unknown) => {
      const type =
        payload && typeof payload === 'object'
          ? (payload as { type?: unknown }).type
          : undefined

      if (type === 'end_chat') {
        disconnectRef.current()
        clearSession()
        clearMessages()
        return
      }

      // Server errors surface in the banner instead of the message list so they
      // don't read like part of the conversation.
      if (type === 'error') {
        const message = (payload as ServerErrorEvent).message
        setBannerMessage({
          content:
            typeof message === 'string' && message.trim()
              ? message
              : 'Something went wrong. Please try again.',
          variant: 'error',
        })
        clearTyping()
        return
      }

      handleServerJson(payload)
    },
    [clearSession, clearMessages, clearTyping, handleServerJson],
  )

  const { sendJsonMessage, readyState, disconnect } = useChatSocket({
    isOpen,
    token,
    conversationId,
    onServerMessage,
    onCloseCleanUp: clearTyping,
  })

  useEffect(() => {
    disconnectRef.current = disconnect
  }, [disconnect])

  useEffect(() => {
    setSender(isOpen ? { readyState, sendJsonMessage } : null)
  }, [isOpen, readyState, sendJsonMessage, setSender])

  const endChat = () => {
    sendJsonMessage({ type: 'end_chat' })
  }

  const openChat = () => {
    setIsOpen(true)
    void ensureSession().catch(() => {
      // authFailed state is handled inside the hook
    })
  }

  const closeChat = () => {
    if (layoutFullscreen) setClosingFullscreen(true)
    setIsOpen(false)
    clearTyping()
  }

  const handleSend = (content: string | FileMessage | FormCaptureData) => appendUserMessage(content)

  useEffect(() => {
    if (isOpen || !closingFullscreen) return
    const t = window.setTimeout(() => {
      setClosingFullscreen(false)
      setIsFullscreen(false) // reset after the close animation finishes
    }, CLOSE_ANIMATION_MS)

    return () => window.clearTimeout(t)
  }, [isOpen, closingFullscreen])

  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = messagesEndRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, isTyping])

  const handleFormSubmit = () => {
    const [normalizedEmail, normalizedPhone, normalizedName] = [email.trim(), phone.trim(), name.trim()]
    if (!normalizedEmail || !normalizedPhone || !normalizedName) return
    appendUserMessage({ email: normalizedEmail, phone: normalizedPhone, name: normalizedName }, true)
  }


  return (
    <div
      className='fixed pointer-events-none'
      style={{
        right: 'var(--chat-offset-right)',
        bottom: 'var(--chat-offset-bottom)',
        zIndex: 'var(--chat-z-index)',
      }}>
      <button
        id='chat-bubble'
        className={
          'pointer-events-auto grid place-items-center rounded-full bg-white active:translate-y-px ' +
          'shadow-[0_10px_25px_rgba(15,23,42,0.18)] hover:shadow-[0_14px_34px_rgba(15,23,42,0.22)]' +
          (isMobile && isOpen ? ' hidden' : '')
        }
        type='button'
        aria-label='Open chat'
        aria-expanded={isOpen}
        aria-controls='chat-bubble-content'
        onClick={() => (isOpen ? closeChat() : openChat())}
        style={{
          width: 'var(--chat-bubble-size)',
          height: 'var(--chat-bubble-size)',
        }}>
        <img
          className='block h-auto object-contain'
          style={{
            width:
              'calc(var(--chat-bubble-size) * var(--chat-bubble-icon-scale))',
          }}
          src={ChatImage}
          alt=''
        />
      </button>

      <div
        id='chat-bubble-content'
        className={
          'chat-font bg-white overflow-hidden flex flex-col transition-all duration-300 antialiased ' +
          (layoutFullscreen
            ? 'fixed origin-center rounded-none'
            : 'absolute right-0 rounded-2xl origin-bottom-right') +
          ' ' +
          (isOpen
            ? 'pointer-events-auto opacity-100 visible translate-y-0 scale-100'
            : 'pointer-events-none opacity-0 invisible translate-y-2 scale-95')
        }
        style={
          layoutFullscreen
            ? {
              top: 'var(--chat-fullscreen-top)',
              right: 'var(--chat-fullscreen-right)',
              bottom: 'var(--chat-fullscreen-bottom)',
              left: 'var(--chat-fullscreen-left)',
              borderRadius: 'var(--chat-fullscreen-radius)',
              boxShadow: '0 24px 80px rgba(15, 23, 42, 0.35)',
            }
            : {
              bottom: 'calc(var(--chat-bubble-size) + var(--chat-gap))',
              width: 'min(var(--chat-panel-width), calc(100vw - 2rem))',
              height:
                'min(var(--chat-panel-height), calc(100vh - var(--chat-panel-viewport-margin)))',
              boxShadow: '0 18px 50px rgba(15, 23, 42, 0.25)',
            }
        }
        role='dialog'
      >
        <div className='flex items-center justify-between gap-3 border-b border-slate-900/10 px-3.5 py-3'>
          <div className='min-w-0 flex flex-col gap-1'>
            <div className='min-w-0 flex items-center gap-2'>
              <div className='truncate text-sm font-bold leading-tight text-slate-900'>
                {SUPPORT_TITLE}
              </div>
              <div className='inline-flex items-center gap-1.5 text-xs leading-none text-slate-900/70'>
                <span
                  className={[
                    'h-2 w-2 rounded-full',
                    isOnline ? 'bg-emerald-500' : 'bg-red-500',
                  ].join(' ')}
                  aria-hidden='true'
                />
                {isOnline ? 'Online' : 'Offline'}
              </div>
            </div>
            <div className='text-xs leading-tight text-slate-900/55'>
              {SUPPORT_META}
            </div>
          </div>

          <div className='inline-flex flex-none items-center gap-1.5'>
            <a
              className='pointer-events-auto inline-grid h-8 w-8 place-items-center rounded-xl bg-slate-900/5 text-slate-900/80 hover:bg-slate-900/10 active:translate-y-px'
              href={SUPPORT_EMAIL_HREF}
              aria-label='Email support'>
              <IconEmail />
            </a>

            {!isMobile && (
              <button
                className='pointer-events-auto inline-grid h-8 w-8 place-items-center rounded-xl bg-slate-900/5 text-slate-900/80 hover:bg-slate-900/10 active:translate-y-px'
                type='button'
                aria-label={
                  isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'
                }
                onClick={() => setIsFullscreen(v => !v)}>
                <IconFullscreen />
              </button>
            )}

            <button
              className='pointer-events-auto inline-grid h-8 w-8 place-items-center rounded-xl bg-slate-900/5 text-slate-900/80 hover:bg-slate-900/10 active:translate-y-px'
              type='button'
              aria-label='Close chat'
              onClick={closeChat}>
              <IconClose />
            </button>
          </div>
        </div>
        <InfoBanner
          message={bannerMessage}
          onClose={() => setBannerMessage(prev => ({ ...prev, content: null }))}
        />
        <button
          className='pointer-events-auto rounded-b-sm bg-slate-900/5 px-2.5 py-2 text-[10px] font-medium leading-none text-slate-900/70 hover:bg-slate-900/10 w-full hover:cursor-pointer'
          type='button'
          aria-label='End chat'
          onClick={endChat}>
          End Chat
        </button>

        <div className='flex flex-1 min-h-0 flex-col'>
          <div className='flex-1 min-h-0 overflow-auto overflow-x-hidden p-1 no-scrollbar' ref={messagesEndRef}>
            <ChatBody
              messages={messages}
              showFormCapture={showFormCapture}
              onFormSubmit={handleFormSubmit}
              email={email}
              phone={phone}
              name={name}
              setEmail={setEmail}
              setPhone={setPhone}
              setName={setName}
            />
          </div>
          {isTyping && <TypingIndicator />}
          <ConnectionStatus
            readyState={readyState}
            authFailed={authFailed}
            isAuthenticating={isAuthenticating}
          />
        </div>

        <ChatComposer
          onSend={handleSend}
          showFormCapture={showFormCapture}
          onBannerMessage={setBannerMessage}
        />
      </div>
    </div>
  )
}
