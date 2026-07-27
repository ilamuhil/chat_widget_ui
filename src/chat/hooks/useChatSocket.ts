import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type SocketReadyState = 'connecting' | 'open' | 'closing' | 'closed'

type UseChatSocketParams = {
  isOpen: boolean
  token: string | null
  conversationId: string | null
  onServerMessage?: (data: unknown) => void
  onClose?: () => void
}

function toWebSocketUrl(httpOrWsUrl: string) {
  if (httpOrWsUrl.startsWith('https://')) return `wss://${httpOrWsUrl.slice('https://'.length)}`
  if (httpOrWsUrl.startsWith('http://')) return `ws://${httpOrWsUrl.slice('http://'.length)}`
  return httpOrWsUrl
}

export function useChatSocket(params: UseChatSocketParams) {
  const { isOpen, token, conversationId, onServerMessage, onClose } = params

  const socketRef = useRef<WebSocket | null>(null)
  const onServerMessageRef = useRef(onServerMessage)
  const onCloseRef = useRef(onClose)
  const tokenRef = useRef(token)
  const conversationIdRef = useRef(conversationId)

  const [readyState, setReadyState] = useState<SocketReadyState>('closed')

  useEffect(() => {
    onServerMessageRef.current = onServerMessage
  }, [onServerMessage])

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    tokenRef.current = token
  }, [token])

  useEffect(() => {
    conversationIdRef.current = conversationId
  }, [conversationId])

  const wsUrl = useMemo(() => {
    const base = (import.meta.env.VITE_CHAT_SERVER_URL as string | undefined)?.trim()
    if (!base) return ''
    return `${toWebSocketUrl(base)}/api/chat/ws`
  }, [])

  const socketUrl = useMemo(
    () => (isOpen && token && conversationId && wsUrl ? wsUrl : null),
    [isOpen, token, conversationId, wsUrl],
  )

  const sendJsonMessage = useCallback((payload: Record<string, unknown>) => {
    const socket = socketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) return
    socket.send(JSON.stringify(payload))
  }, [])

  useEffect(() => {
    if (!socketUrl) return

    let cancelled = false
    const socket = new WebSocket(socketUrl)
    socketRef.current = socket
    // This state reflects the external socket created immediately above.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReadyState('connecting')

    socket.onopen = () => {
      if (cancelled || socketRef.current !== socket) return
      setReadyState('open')

      const activeToken = tokenRef.current
      const activeConversationId = conversationIdRef.current
      if (!activeToken || !activeConversationId) return

      socket.send(
        JSON.stringify({
          token: activeToken,
          conversation_id: activeConversationId,
        }),
      )
    }

    socket.onmessage = (evt: MessageEvent) => {
      if (cancelled || socketRef.current !== socket) return
      const handler = onServerMessageRef.current
      if (!handler) return

      const raw = evt.data
      if (typeof raw !== 'string') {
        handler(raw)
        return
      }

      try {
        handler(JSON.parse(raw))
      } catch {
        handler(raw)
      }
    }

    socket.onclose = () => {
      if (cancelled) return
      if (socketRef.current === socket) {
        socketRef.current = null
      }
      setReadyState('closed')
      onCloseRef.current?.()
    }

    return () => {
      cancelled = true
      if (socketRef.current === socket) {
        socketRef.current = null
      }
      if (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN) {
        socket.close()
      }
    }
  }, [socketUrl])

  const disconnect = useCallback(() => {
    const socket = socketRef.current
    if (!socket) {
      setReadyState('closed')
      return
    }

    socketRef.current = null
    setReadyState('closing')
    socket.close()
    setReadyState('closed')
    onCloseRef.current?.()
  }, [])

  return {
    sendJsonMessage,
    readyState,
    disconnect,
  }
}
