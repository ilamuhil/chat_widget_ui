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

function sessionStorageKeys(bot_id: string) {
  return {
    token: `${bot_id}:token`,
    conversationId: `${bot_id}:conversation_id`,
    botConfig: `${bot_id}:bot_config`,
    visitor: `${bot_id}:visitor_id`,
  };
}

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
    const keys = sessionStorageKeys(bot_id);
    return {
      token: localStorage.getItem(keys.token),
      conversationId: localStorage.getItem(keys.conversationId),
      isAuthenticating: false,
      authFailed: false,
    };
  });

  const clearSession = useCallback(() => {
    if (typeof window === "undefined") return;
    const keys = sessionStorageKeys(bot_id);
    localStorage.removeItem(keys.conversationId);
    localStorage.removeItem(keys.token);
    localStorage.removeItem(keys.botConfig);
    setState((prev) => ({
      ...prev,
      token: null,
      conversationId: null,
      isAuthenticating: false,
      authFailed: false,
    }));
  }, [bot_id]);

  const ensureSession = useCallback((): Promise<void> => {
    if (typeof window === "undefined") return Promise.resolve();
    if (authenticationRef.current) return authenticationRef.current;
    const keys = sessionStorageKeys(bot_id);

    const authenticate = async () => {
      const existingConversationId = localStorage.getItem(keys.conversationId);
      const existingToken = localStorage.getItem(keys.token);
      const tokenExpired = existingToken ? isJwtExpired(existingToken) : true;

      if (existingConversationId && existingToken && !tokenExpired) {
        if (!localStorage.getItem(keys.visitor)) {
          localStorage.setItem(keys.visitor, crypto.randomUUID());
        }
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
        localStorage.removeItem(keys.token);
      }

      setState((prev) => ({
        ...prev,
        isAuthenticating: true,
        authFailed: false,
      }));
      try {
        const data = await verifyChat({ api_key });
        localStorage.setItem(keys.conversationId, data.conversation_id);
        localStorage.setItem(keys.token, data.token);
        localStorage.setItem(keys.botConfig, JSON.stringify(data.bot_config));
        if (!localStorage.getItem(keys.visitor)) {
          localStorage.setItem(keys.visitor, crypto.randomUUID());
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
