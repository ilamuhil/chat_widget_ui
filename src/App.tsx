import ChatWidget from "./chat/ChatWidget";

const api_key = "bot_pLqfknP_jTMqqtj9nHbFjjQJ";
const bot_id = "ae3d7ead-ae41-406c-8700-34b966af7cf6";

type AppProps = {
  config?: Record<string, unknown>;
};

const App = ({ config }: AppProps) => {
  const configuredApiKey =
    typeof config?.api_key === "string" ? config.api_key : api_key;
  const configuredBotId =
    typeof config?.bot_id === "string" ? config.bot_id : bot_id;

  return <ChatWidget api_key={configuredApiKey} bot_id={configuredBotId} />;
};

export default App;
