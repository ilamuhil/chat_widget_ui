import { useCallback, useState } from 'react'
import { verifyChat } from '../../api/verify'
import { isJwtExpired } from '../utils/jwt'

type ChatSessionState = {
  token: string | null
  conversationId: string | null
  isAuthenticating: boolean
  authFailed: boolean
}

type UseChatSessionParams = {
  api_key: string
  bot_id: string
  domain: string
}

const STORAGE_TOKEN_KEY = 'token'
const STORAGE_CONVERSATION_ID_KEY = 'conversation_id'

export function useChatSession(params: UseChatSessionParams) {
  const { api_key, bot_id, domain } = params

  const [state, setState] = useState<ChatSessionState>(() => {
    if (typeof window === 'undefined') {
      return { token: null, conversationId: null, isAuthenticating: false, authFailed: false }
    }
    return {
      token: sessionStorage.getItem(STORAGE_TOKEN_KEY),
      conversationId: sessionStorage.getItem(STORAGE_CONVERSATION_ID_KEY),
      isAuthenticating: false,
      authFailed: false,
    }
  })

  const clearSession = useCallback(() => {
    if (typeof window === 'undefined') return
    sessionStorage.removeItem(STORAGE_CONVERSATION_ID_KEY)
    sessionStorage.removeItem(STORAGE_TOKEN_KEY)
    setState(prev => ({ ...prev, token: null, conversationId: null, isAuthenticating: false, authFailed: false }))
  }, [])

  const ensureSession = useCallback(async () => {
    if (typeof window === 'undefined') return

    const existingConversationId = sessionStorage.getItem(STORAGE_CONVERSATION_ID_KEY)
    const existingToken = sessionStorage.getItem(STORAGE_TOKEN_KEY)
    const tokenExpired = existingToken ? isJwtExpired(existingToken) : true

    if (existingConversationId && existingToken && !tokenExpired) {
      setState(prev => ({
        ...prev,
        conversationId: existingConversationId,
        token: existingToken,
        isAuthenticating: false,
        authFailed: false,
      }))
      return
    }

    // If token is expired/invalid, remove it so we don't try to reuse it.
    if (tokenExpired) {
      sessionStorage.removeItem(STORAGE_TOKEN_KEY)
    }

    setState(prev => ({ ...prev, isAuthenticating: true, authFailed: false }))
    try {
      const data = await verifyChat({ domain, api_key, bot_id })
      sessionStorage.setItem(STORAGE_CONVERSATION_ID_KEY, data.conversation_id)
      sessionStorage.setItem(STORAGE_TOKEN_KEY, data.token)

      setState(prev => ({
        ...prev,
        conversationId: data.conversation_id,
        token: data.token,
        isAuthenticating: false,
        authFailed: false,
      }))
    } catch (e) {
      setState(prev => ({ ...prev, isAuthenticating: false, authFailed: true }))
      throw e
    }
  }, [api_key, bot_id, domain])

  return {
    token: state.token,
    conversationId: state.conversationId,
    isAuthenticating: state.isAuthenticating,
    authFailed: state.authFailed,
    ensureSession,
    clearSession,
  }
}

