import { useEffect, useState } from 'react'
import ChatImage from '../assets/chat.png'
import { IconClose, IconEmail, IconFullscreen } from '../assets/icons'
import useIsMobile from '../hooks/useIsMobile'
import ChatBody from './ChatBody'
import ChatComposer from './ChatComposer'
import TypingIndicator from './TypingIndicator'
import './styles/custom.css'
import { verifyChat } from '../api/verify'
import useWebSocket, { ReadyState } from 'react-use-websocket'
import type { Role } from '../helpers'

const MOBILE_MAX_WIDTH_PX = 768
const CLOSE_ANIMATION_MS = 320
const SUPPORT_TITLE = 'Support'
const SUPPORT_META = 'Typically replies in ~5 min'
const SUPPORT_EMAIL_HREF = 'mailto:support@example.com'

type WidgetProps = {
  api_key: string
  bot_id: number
}

type ChatMessage = {
  role: Role
  content: string
  contentType: string
  timestamp: string
  agentName?: string
}

const pad2 = (n: number) => String(n).padStart(2, '0')
const formatTimestamp = (d: Date) => {
  // match sample format: 'YYYY-MM-DD HH:mm:ss'
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(
    d.getDate()
  )} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

const isJwtExpired = (token: string, skewSeconds = 5) => {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return true
    let payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    while (payloadB64.length % 4) payloadB64 += '='
    const payload = JSON.parse(atob(payloadB64)) as { exp?: number }
    const expSeconds = payload?.exp
    if (typeof expSeconds !== 'number') return true
    return expSeconds * 1000 <= Date.now() + skewSeconds * 1000
  } catch {
    return true
  }
}

export default function ChatWidget(props: WidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [closingFullscreen, setClosingFullscreen] = useState(false)
  const isOnline = true
  const [isTyping, setIsTyping] = useState(false)

  const isMobile = useIsMobile(MOBILE_MAX_WIDTH_PX)
  const effectiveFullscreen = isMobile ? isOpen : isFullscreen
  const layoutFullscreen = effectiveFullscreen || closingFullscreen
  const [socketUrl, setSocketUrl] = useState<string>('')
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [authFailed, setAuthFailed] = useState(false)

  const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket(
    socketUrl,
    {
      onOpen: () => {
        const token = sessionStorage.getItem('token')
        const conversation_id = sessionStorage.getItem('conversation_id')
        if (!token || !conversation_id) return

        // First message must be auth payload for FastAPI `authenticate_socket()`
        sendJsonMessage({ token, conversation_id })
      },
      onClose: () => {
        console.log('WebSocket connection closed')
      },
    }
  )

  const [messages, setMessages] = useState<Array<ChatMessage>>([])

  const endChat = () => {
    // Clear client-side session so next open will re-auth and start a fresh conversation.
    sessionStorage.removeItem('conversation_id')
    sessionStorage.removeItem('token')
    setMessages([])
    setSocketUrl('')
    setIsAuthenticating(false)
    setAuthFailed(false)
    setIsTyping(false)
    closeChat()
  }

  const closeChat = () => {
    if (layoutFullscreen) setClosingFullscreen(true)
    setIsOpen(false)
    // Disconnect socket when the UI is closed so reopening always reconnects cleanly.
    setSocketUrl('')
    setIsTyping(false)
  }

  const handleSend = (content: string) => {
    const outgoing: ChatMessage = {
      role: 'user',
      content,
      contentType: 'text',
      timestamp: formatTimestamp(new Date()),
    }
    setMessages(prev => [...prev, outgoing])

    if (readyState === ReadyState.OPEN) {
      // Must match what your FastAPI handlers expect; keep it simple + JSON.
      sendJsonMessage({ content, contentType: 'text' })
    }
  }

  useEffect(() => {
    if (isOpen || !closingFullscreen) return
    const t = window.setTimeout(() => {
      setClosingFullscreen(false)
      setIsFullscreen(false) // reset after the close animation finishes
    }, CLOSE_ANIMATION_MS)

    return () => window.clearTimeout(t)
  }, [isOpen, closingFullscreen])

  useEffect(() => {
    if (!lastJsonMessage) return

    // Accept flexible server payloads:
    // - { content: string, role?: 'assistant'|'agent'|'user', agentName?: string }
    // - { message: string }
    // - string
    const asAny = lastJsonMessage as unknown
    let role: Role = 'assistant'
    let content: string | undefined
    let agentName: string | undefined

    if (typeof asAny === 'string') {
      content = asAny
    } else if (typeof asAny === 'object' && asAny !== null) {
      const obj = asAny as Record<string, unknown>

      // Typing indicator events (show only for AI/agent typing)
      if (obj.type === 'typing' && typeof obj.is_typing === 'boolean') {
        const from = obj.from
        if (from === 'assistant' || from === 'agent') {
          setIsTyping(obj.is_typing)
        }
        return
      }

      if (typeof obj.role === 'string') {
        const r = obj.role as Role
        role = r
      }
      if (typeof obj.agentName === 'string') agentName = obj.agentName
      if (typeof obj.content === 'string') content = obj.content
      if (!content && typeof obj.message === 'string') content = obj.message
    }

    // Ignore non-chat payloads
    if (!content) return

    setMessages(prev => [
      ...prev,
      {
        role,
        content,
        contentType: 'text',
        timestamp: formatTimestamp(new Date()),
        ...(agentName ? { agentName } : null),
      } as ChatMessage,
    ])
  }, [lastJsonMessage])

  useEffect(() => {
    const conversation_id = sessionStorage.getItem('conversation_id')
    const token = sessionStorage.getItem('token')
    if (!isOpen) return

    // Reset auth error when attempting to (re)open and connect.
    setAuthFailed(false)

    const tokenExpired = token ? isJwtExpired(token) : true
    if (!conversation_id || !token || tokenExpired) {
      if (tokenExpired) {
        sessionStorage.removeItem('token')
      }
      ;(async () => {
        setIsAuthenticating(true)
        try {
          const data = await verifyChat({
            domain: window.location.hostname,
            api_key: props.api_key,
            bot_id: props.bot_id,
          })
          const { conversation_id, token } = data
          sessionStorage.setItem('conversation_id', conversation_id)
          sessionStorage.setItem('token', token)
          setSocketUrl(`${import.meta.env.VITE_CHAT_SERVER_URL}/api/chat/ws`)
        } catch (error) {
          setAuthFailed(true)
          console.error(error)
        } finally {
          setIsAuthenticating(false)
        }
      })()
    } else {
      // We still need to connect; auth is sent as the first WS message in `onOpen`.
      setSocketUrl(`${import.meta.env.VITE_CHAT_SERVER_URL}/api/chat/ws`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

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
        onClick={() => (isOpen ? closeChat() : setIsOpen(true))}
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
        aria-hidden={!isOpen}>
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
            <button
              className='pointer-events-auto rounded-full bg-slate-900/5 px-2.5 py-1 text-[11px] font-medium leading-none text-slate-900/70 hover:bg-slate-900/10'
              type='button'
              aria-label='End chat'
              onClick={endChat}>
              End
            </button>

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

        <div className='flex flex-1 min-h-0 flex-col'>
          <div className='flex-1 min-h-0 overflow-auto overflow-x-hidden p-1'>
            <ChatBody messages={messages} />
          </div>
          {isTyping && <TypingIndicator />}
          <ConnectorAnimation
            readyState={readyState}
            authFailed={authFailed}
            isAuthenticating={isAuthenticating}
          />
        </div>

        <ChatComposer
          showBranding
          brandingHref='https://example.com'
          brandingLabel='Sample'
          onSend={handleSend}
        />
      </div>
    </div>
  )
}

function ConnectorAnimation(props: {
  readyState: ReadyState
  isAuthenticating: boolean
  authFailed: boolean
}) {
  const { readyState, isAuthenticating, authFailed } = props

  const view = authFailed
    ? {
        label: 'Connection failed',
        colorClass: 'text-rose-600',
        dotClass: 'bg-rose-500/70',
      }
    : isAuthenticating || readyState === ReadyState.CONNECTING
    ? {
        label: 'Connecting',
        colorClass: 'text-slate-500',
        dotClass: 'bg-slate-400/60',
      }
    : readyState === ReadyState.OPEN
    ? {
        label: 'Connected',
        colorClass: 'text-emerald-600',
        dotClass: 'bg-emerald-500/70',
      }
    : {
        label: 'Connection failed',
        colorClass: 'text-rose-600',
        dotClass: 'bg-rose-500/70',
      }

  return (
    <div
      className={`flex items-center justify-center gap-1 text-[10px] ${view.colorClass} mb-1 bg-gray-100 rounded-t-lg p-1.5`}>
      <span
        className={`h-1.5 w-1.5 animate-pulse rounded-full ${view.dotClass}`}
        aria-hidden='true'
      />
      <span className='italic'>{view.label}</span>
    </div>
  )
}
