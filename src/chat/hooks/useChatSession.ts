import { useCallback, useRef, useState } from 'react'
import { verifyChat, type BotConfig } from '../../api/verify'
import { isJwtExpired } from '../utils/jwt'

type ChatSessionState = {
  token: string | null
  conversationId: string | null
  isAuthenticating: boolean
  authFailed: boolean
  bot_config?: BotConfig
}

type UseChatSessionParams = {
  api_key: string
  bot_id: string
}

const STORAGE_TOKEN_KEY = 'token'
const STORAGE_CONVERSATION_ID_KEY = 'conversation_id'

export function useChatSession(params: UseChatSessionParams) {
  const { api_key, bot_id } = params
  const authenticationRef = useRef<Promise<void> | null>(null)

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

  const ensureSession = useCallback((): Promise<void> => {
    if (typeof window === 'undefined') return Promise.resolve()
    if (authenticationRef.current) return authenticationRef.current

    const authenticate = async () => {
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
        const data = await verifyChat({ api_key, bot_id })
        sessionStorage.setItem(STORAGE_CONVERSATION_ID_KEY, data.conversation_id)
        sessionStorage.setItem(STORAGE_TOKEN_KEY, data.token)

        setState(prev => ({
          ...prev,
          conversationId: data.conversation_id,
          token: data.token,
          bot_config: data.bot_config,
          isAuthenticating: false,
          authFailed: false,
        }))
      } catch (e) {
        setState(prev => ({ ...prev, isAuthenticating: false, authFailed: true }))
        throw e
      }
    }

    const authentication = authenticate().finally(() => {
      if (authenticationRef.current === authentication) {
        authenticationRef.current = null
      }
    })
    authenticationRef.current = authentication
    return authentication
  }, [api_key, bot_id])

  return {
    token: state.token,
    conversationId: state.conversationId,
    isAuthenticating: state.isAuthenticating,
    authFailed: state.authFailed,
    bot_config: state.bot_config,
    ensureSession,
    clearSession,
  }
}

