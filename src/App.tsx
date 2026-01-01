import ChatWidget from './chat/ChatWidget'

type Props = {
  api_key: string
  bot_id: string
}
const api_key = 'bot_QCd-mXM2fxoH2S2EG4r6Oov1'
const bot_id = 1
const App = (props: Props) => {
  return (
    <ChatWidget api_key={api_key} bot_id={bot_id} />
  )
}

export default App
