import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import App from "./App";
import type { ChatWidgetConfigInput } from "./widgetConfig";

export function mountWidget(
  div: HTMLElement,
  chatConfig: ChatWidgetConfigInput,
) {
  console.log("running from chat root");
  createRoot(div).render(
    <StrictMode>
      <App config={chatConfig} />
    </StrictMode>,
  );
}
