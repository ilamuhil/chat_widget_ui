import axios from 'axios'

export type VerificationRequest = {
  domain: string
  api_key: string
  bot_id: number
}

export type VerificationResponse = {
  conversation_id: string
  token: string
}

export async function verifyChat({
  domain,
  api_key,
  bot_id,
}: VerificationRequest): Promise<VerificationResponse> {
  const API_URL_BASE = import.meta.env.VITE_API_URL_BASE as string | undefined
  if (!API_URL_BASE) {
    throw new Error('Missing VITE_API_URL_BASE')
  }
  try {
    const response = await axios.post<VerificationResponse>(`${API_URL_BASE}/api/auth/user/chat`, {
      domain,
      api_key,
      bot_id,
    })
    console.log("Authentication Successful")
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