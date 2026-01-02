import ChatWidget from './chat/ChatWidget'

const api_key = 'bot_QCd-mXM2fxoH2S2EG4r6Oov1'
const bot_id = 1

type AppProps = {
  config?: Record<string, unknown>
}

const App = ({ config }: AppProps) => {
  const configuredApiKey = typeof config?.api_key === 'string' ? config.api_key : api_key
  const configuredBotId = typeof config?.bot_id === 'number' ? config.bot_id : bot_id

  return (
    <ChatWidget api_key={configuredApiKey} bot_id={configuredBotId} />
  )
}

export default App
