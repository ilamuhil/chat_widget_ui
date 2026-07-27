import ChatWidget from './chat/ChatWidget'

const api_key = 'bot_kS4f1lMTTc18fxNs0W_Ak5vU'
const bot_id = 'fac1bfe4-8d66-4ea8-8d65-c0bd415ba5fa'

type AppProps = {
  config?: Record<string, unknown>
}

const App = ({ config }: AppProps) => {
  const configuredApiKey = typeof config?.api_key === 'string' ? config.api_key : api_key
  const configuredBotId = typeof config?.bot_id === 'string' ? config.bot_id : bot_id

  return (
    <ChatWidget api_key={configuredApiKey} bot_id={configuredBotId} />
  )
}

export default App
