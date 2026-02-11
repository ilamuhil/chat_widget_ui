import type { Role } from '../helpers'

export type { Role }

export type ChatMessage = {
  role: Role
  content: string
  contentType: string
  timestamp: string
  agentName?: string
}

export type ServerTypingEvent = {
  type: 'typing'
  from?: 'assistant' | 'agent' | 'user' | string
  is_typing: boolean
  conversation_id?: string
}

export type ServerMessageEvent = {
  type?: 'message' | string
  role?: Role | string
  agentName?: string
  message?: string
  content?: string
  conversation_id?: string
}

export type ServerErrorEvent = {
  type: 'error' | string
  message: string
  conversation_id?: string
}

