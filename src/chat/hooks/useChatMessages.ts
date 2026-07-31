import { useCallback, useRef, useState } from 'react'
import type {
  ChatMessage,
  Role,
  ServerErrorEvent,
  ServerMessageEvent,
  ServerTypingEvent,
  ServerFormCapturedEvent,
} from '../types'
import { formatTimestamp } from '../utils/time'

import type { SocketReadyState } from './useChatSocket'

type Sender = {
  readyState: SocketReadyState
  sendJsonMessage: (data: Record<string, unknown>) => void
}

type FormCaptureData = {
  email: string
  phone: string
  name: string
}

function extractText(value: unknown): string {
  if (typeof value === 'string') return value

  if (Array.isArray(value)) {
    return value
      .map(block => {
        if (typeof block === 'string') return block
        if (!block || typeof block !== 'object') return ''
        const record = block as Record<string, unknown>
        if (typeof record.text === 'string') return record.text
        if (typeof record.content === 'string') return record.content
        return ''
      })
      .filter(Boolean)
      .join('\n\n')
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (typeof record.text === 'string') return record.text
    if (typeof record.content === 'string') return record.content
  }

  return ''
}

export function useChatMessages(props: { toggleFormVisibility: () => void }) {
  const { toggleFormVisibility } = props
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
    (content: string | FormCaptureData, isFormCaptureData: boolean = false) => {
      //Send the message to the server.
      const sender = senderRef.current
      if (sender) {
        sender.sendJsonMessage({
          type: isFormCaptureData ? 'form_capture' : 'message',
          content: isFormCaptureData
            ? `${(content as FormCaptureData).name}:${(content as FormCaptureData).email}:${(content as FormCaptureData).phone}`
            : (content as string),
        })
        toggleFormVisibility()
        setIsTyping(true)
      }

      //Update the ui if this is not a form capture message.
      if (!isFormCaptureData) {
        const outgoing: ChatMessage = {
          role: 'user',
          content: content as string,
          contentType: isFormCaptureData ? 'form_capture' : 'message',
          timestamp: formatTimestamp(new Date()),
        }
        setMessages(prev => [...prev, outgoing])
      }
    },
    [toggleFormVisibility],
  )

  const clearTyping = useCallback(() => {
    setIsTyping(false)
  }, [])

  const handleServerJson = useCallback(
    (payload: unknown) => {
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

      if (obj.type === 'form_capture') {
        const ev = obj as unknown as ServerFormCapturedEvent
        toggleFormVisibility(false)
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: ev.message,
            contentType: 'text',
            timestamp: formatTimestamp(new Date()),
          },
        ])
        clearTyping()
        return
      }

      if (obj.type === 'form_required') {
        toggleFormVisibility(true)
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
        clearTyping()
        return
      }

      // Regular messages
      const ev = obj as unknown as ServerMessageEvent
      const content = extractText(ev.content) || extractText(ev.message)
      if (!content) return

      const role: Role =
        typeof ev.role === 'string' &&
        (ev.role === 'user' || ev.role === 'assistant' || ev.role === 'agent')
          ? ev.role
          : 'assistant'

      setMessages(prev => [
        ...prev,
        {
          role,
          content,
          contentType: 'text',
          timestamp: formatTimestamp(new Date()),
          ...(typeof ev.agentName === 'string'
            ? { agentName: ev.agentName }
            : null),
        } as ChatMessage,
      ])
      clearTyping()
    },
    [toggleFormVisibility, clearTyping],
  )

  return {
    messages,
    isTyping,
    appendUserMessage,
    clearMessages,
    handleServerJson,
    clearTyping,
    setSender,
  }
}
