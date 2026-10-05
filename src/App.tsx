import ChatWidget from "./chat/ChatWidget";

const api_key = "bot_BRZaGAHvCegp534U8-bL4KoF";
const bot_id = "c983cec8-004a-4619-a8ab-8fd4439aaca3";

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
