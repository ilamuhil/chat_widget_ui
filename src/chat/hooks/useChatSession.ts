import { useCallback, useEffect, useRef, useState } from "react";
import { verifyChat, type BotConfig } from "../../api/verify";
import { getJwtExpirationTime, isJwtExpired } from "../utils/jwt";

type ChatSessionState = {
  token: string | null;
  conversationId: string | null;
  isAuthenticating: boolean;
  authFailed: boolean;
  bot_config?: BotConfig;
};

type UseChatSessionParams = {
  api_key: string;
  bot_id: string;
};

const STORAGE_TOKEN_KEY = "token";
const STORAGE_CONVERSATION_ID_KEY = "conversation_id";
const BOT_CONFIG_KEY = "bot_config";

export function useChatSession(params: UseChatSessionParams) {
  const { api_key, bot_id } = params;
  const authenticationRef = useRef<Promise<void> | null>(null);

  const [state, setState] = useState<ChatSessionState>(() => {
    if (typeof window === "undefined") {
      return {
        token: null,
        conversationId: null,
        isAuthenticating: false,
        authFailed: false,
      };
    }
    return {
      token: localStorage.getItem(STORAGE_TOKEN_KEY),
      conversationId: localStorage.getItem(STORAGE_CONVERSATION_ID_KEY),
      isAuthenticating: false,
      authFailed: false,
    };
  });

  const clearSession = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_CONVERSATION_ID_KEY);
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(BOT_CONFIG_KEY);
    setState((prev) => ({
      ...prev,
      token: null,
      conversationId: null,
      isAuthenticating: false,
      authFailed: false,
    }));
  }, []);

  const ensureSession = useCallback((): Promise<void> => {
    if (typeof window === "undefined") return Promise.resolve();
    if (authenticationRef.current) return authenticationRef.current;

    const authenticate = async () => {
      const existingConversationId = localStorage.getItem(
        STORAGE_CONVERSATION_ID_KEY,
      );
      const existingToken = localStorage.getItem(STORAGE_TOKEN_KEY);
      const tokenExpired = existingToken ? isJwtExpired(existingToken) : true;

      if (existingConversationId && existingToken && !tokenExpired) {
        setState((prev) => ({
          ...prev,
          conversationId: existingConversationId,
          token: existingToken,
          isAuthenticating: false,
          authFailed: false,
        }));
        return;
      }

      // If token is expired/invalid, remove it so we don't try to reuse it.
      if (tokenExpired) {
        localStorage.removeItem(STORAGE_TOKEN_KEY);
      }

      setState((prev) => ({
        ...prev,
        isAuthenticating: true,
        authFailed: false,
      }));
      try {
        const data = await verifyChat({ api_key });
        localStorage.setItem(STORAGE_CONVERSATION_ID_KEY, data.conversation_id);
        localStorage.setItem(STORAGE_TOKEN_KEY, data.token);
        localStorage.setItem(BOT_CONFIG_KEY, JSON.stringify(data.bot_config));
        if (!localStorage.getItem(`${bot_id}:visitor_id`)) {
          localStorage.setItem(`${bot_id}:visitor_id`, crypto.randomUUID());
        }
        setState((prev) => ({
          ...prev,
          conversationId: data.conversation_id,
          token: data.token,
          bot_config: data.bot_config,
          isAuthenticating: false,
          authFailed: false,
        }));
      } catch (e) {
        setState((prev) => ({
          ...prev,
          isAuthenticating: false,
          authFailed: true,
        }));
        throw e;
      }
    };

    const authentication = authenticate().finally(() => {
      if (authenticationRef.current === authentication) {
        authenticationRef.current = null;
      }
    });
    authenticationRef.current = authentication;
    return authentication;
  }, [api_key, bot_id]);

  useEffect(() => {
    if (!state.token) return;

    const expiresAt = getJwtExpirationTime(state.token);
    if (expiresAt === null) {
      void ensureSession().catch(() => {
        // authFailed is updated inside ensureSession.
      });
      return;
    }

    // Refresh shortly before expiry so the socket does not use a stale token.
    const refreshInMs = Math.max(0, expiresAt - Date.now() - 5_000);
    const timeoutId = window.setTimeout(() => {
      void ensureSession().catch(() => {
        // authFailed is updated inside ensureSession.
      });
    }, refreshInMs);

    return () => window.clearTimeout(timeoutId);
  }, [state.token, ensureSession]);

  return {
    token: state.token,
    conversationId: state.conversationId,
    isAuthenticating: state.isAuthenticating,
    authFailed: state.authFailed,
    bot_config: state.bot_config,
    ensureSession,
    clearSession,
  };
}
