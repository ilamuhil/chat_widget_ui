import ChatWidget from "./chat/ChatWidget";
import {
  normalizeChatTheme,
  type ChatTheme,
  type ChatWidgetConfigInput,
} from "./widgetConfig";

const api_key = "bot_BRZaGAHvCegp534U8-bL4KoF";
const bot_id = "c983cec8-004a-4619-a8ab-8fd4439aaca3";
const theme: ChatTheme = "dark";

type AppProps = {
  config?: ChatWidgetConfigInput;
};

const App = ({ config }: AppProps) => {
  const configuredApiKey =
    typeof config?.api_key === "string" ? config.api_key : api_key;
  const configuredBotId =
    typeof config?.bot_id === "string" ? config.bot_id : bot_id;
  const configuredTheme = normalizeChatTheme(config?.theme ?? theme);

  return (
    <ChatWidget
      api_key={configuredApiKey}
      bot_id={configuredBotId}
      theme={configuredTheme}
    />
  );
};

export default App;
