import { useMemo } from 'react'
import useWebSocket, { ReadyState } from 'react-use-websocket'

type UseChatSocketParams = {
  isOpen: boolean
  token: string | null
  conversationId: string | null
  onJsonMessage?: (data: unknown) => void
  onClose?: () => void
}

export function useChatSocket(params: UseChatSocketParams) {
  const { isOpen, token, conversationId, onJsonMessage, onClose } = params

  const wsUrl = useMemo(() => {
    const base = import.meta.env.VITE_CHAT_SERVER_URL as string | undefined
    if (!base) return ''
    return `${base}/api/chat/ws`
  }, [])

  const socketUrl = isOpen && token && conversationId && wsUrl ? wsUrl : null

  const { sendJsonMessage, readyState } = useWebSocket(socketUrl, {
    onOpen: () => {
      if (!token || !conversationId) return
      // First message must be auth payload for FastAPI `authenticate_socket()`
      sendJsonMessage({ token, conversation_id: conversationId })
    },
    onMessage: (evt: MessageEvent) => {
      if (!onJsonMessage) return
      const raw = evt.data
      if (typeof raw !== 'string') {
        onJsonMessage(raw)
        return
      }
      try {
        onJsonMessage(JSON.parse(raw))
      } catch {
        onJsonMessage(raw)
      }
    },
    onClose: () => {
      onClose?.()
    },
  })

  return {
    sendJsonMessage,
    readyState: readyState as ReadyState,
    disconnect: () => {
      // no-op: disconnect is driven by `socketUrl=null` when `isOpen` is false.
      // (kept for ergonomic symmetry at callsites)
    },
  }
}

