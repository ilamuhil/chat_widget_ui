import axios from 'axios'

export type BotConfig = {
  tone: string
  role: string
  firstMessage: string
  confirmationMessage: string
  leadCaptureMessage: string
  leadCaptureTiming: string
  captureName: boolean
  captureEmail: boolean
  capturePhone: boolean
}

export type VerificationRequest = {
  api_key: string
  bot_id: string
}

export type VerificationResponse = {
  conversation_id: string
  token: string
  bot_config?: BotConfig
}

export async function verifyChat({
  api_key,
  bot_id,
}: VerificationRequest): Promise<VerificationResponse> {
  const API_URL_BASE = import.meta.env.VITE_API_URL_BASE as string | undefined
  if (!API_URL_BASE) {
    throw new Error('Missing VITE_API_URL_BASE')
  }
  try {
    const response = await axios.post<VerificationResponse>(`${API_URL_BASE}/api/auth/user/token`, {
      api_key,
      bot_id,
    })
    console.log('Authentication Successful')
    console.log(response.data)
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Authentication Failed', error.response?.data)
    } else {
      console.error('Authentication Failed', error)
    }
    throw error
  }
}
