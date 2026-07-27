import { useCallback, useRef, useState } from 'react'
import type { ChatMessage, Role, ServerErrorEvent, ServerMessageEvent, ServerTypingEvent } from '../types'
import { formatTimestamp } from '../utils/time'

import type { SocketReadyState } from './useChatSocket'

type Sender = {
  readyState: SocketReadyState
  sendJsonMessage: (data: Record<string, unknown>) => void
}

export function useChatMessages() {
  const [messages, setMessages] = useState<Array<ChatMessage>>([])
  const [isTyping, setIsTyping] = useState(false)
  const senderRef = useRef<Sender | null>(null)

  const setSender = useCallback((sender: Sender | null) => {
    senderRef.current = sender
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setIsTyping(false)
  }, [])

  const appendUserMessage = useCallback(
    (content: string) => {
      const outgoing: ChatMessage = {
        role: 'user',
        content,
        contentType: 'text',
        timestamp: formatTimestamp(new Date()),
      }
      setMessages(prev => [...prev, outgoing])

      const sender = senderRef.current
      if (sender && sender.readyState === "open") {
        // Server reads either `message` or `content`.
        sender.sendJsonMessage({ content, contentType: 'text' })
      }
    },
    [],
  )

  const handleServerJson = useCallback((payload: unknown) => {
    if (!payload) return

    if (typeof payload === 'string') {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: payload,
          contentType: 'text',
          timestamp: formatTimestamp(new Date()),
        },
      ])
      return
    }

    if (typeof payload !== 'object' || payload === null) return
    const obj = payload as Record<string, unknown>

    // Typing indicator events
    if (obj.type === 'typing' && typeof obj.is_typing === 'boolean') {
      const ev = obj as unknown as ServerTypingEvent
      if (ev.from === 'assistant' || ev.from === 'agent') {
        setIsTyping(ev.is_typing)
      }
      return
    }

    // Errors from server
    if (obj.type === 'error' && typeof obj.message === 'string') {
      const ev = obj as unknown as ServerErrorEvent
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: ev.message,
          contentType: 'text',
          timestamp: formatTimestamp(new Date()),
        },
      ])
      return
    }

    // Regular messages
    const ev = obj as unknown as ServerMessageEvent
    const content = (typeof ev.content === 'string' && ev.content) || (typeof ev.message === 'string' && ev.message) || ''
    if (!content) return

    const role: Role =
      typeof ev.role === 'string' && (ev.role === 'user' || ev.role === 'assistant' || ev.role === 'agent') ? ev.role : 'assistant'

    setMessages(prev => [
      ...prev,
      {
        role,
        content,
        contentType: 'text',
        timestamp: formatTimestamp(new Date()),
        ...(typeof ev.agentName === 'string' ? { agentName: ev.agentName } : null),
      } as ChatMessage,
    ])
  }, [])

  const handleSocketClose = useCallback(() => {
    setIsTyping(false)
  }, [])

  return { messages, isTyping, appendUserMessage, clearMessages, handleServerJson, handleSocketClose, setSender }
}

