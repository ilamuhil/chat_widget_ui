export type BotConfig = {
  tone: string;
  role: string;
  firstMessage: string;
  confirmationMessage: string;
  leadCaptureMessage: string;
  leadCaptureTiming: string;
  captureName: boolean;
  captureEmail: boolean;
  capturePhone: boolean;
};

export type VerificationRequest = {
  api_key: string;
};

export type VerificationResponse = {
  conversation_id: string;
  token: string;
  bot_config?: BotConfig;
};

export async function verifyChat({
  api_key,
}: VerificationRequest): Promise<VerificationResponse> {
  const API_URL_BASE = import.meta.env.VITE_API_URL_BASE as string | undefined;
  if (!API_URL_BASE) {
    throw new Error("Missing API_URL_BASE");
  }
  const response = await fetch(`${API_URL_BASE}/api/auth/user/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key,
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    let details: unknown = responseText;
    try {
      details = JSON.parse(responseText);
    } catch {
      // Keep the plain response body when it is not JSON.
    }

    console.error("Authentication Failed", details);
    throw new Error(`Authentication failed (${response.status})`);
  }

  const data = (await response.json()) as VerificationResponse;
  if (
    typeof data.token !== "string" ||
    typeof data.conversation_id !== "string"
  ) {
    throw new Error(
      "Authentication response is missing token or conversation_id",
    );
  }

  return data;
}
