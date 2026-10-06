import type { ChatWidgetConfigInput } from "../widgetConfig";

declare global {
  interface Window {
    chatInject?: (chatConfig: ChatWidgetConfigInput) => void;
  }
}

function chatInject(chatConfig: ChatWidgetConfigInput) {
  const div = document.createElement("div");
  div.id = "chat-widget-interface";
  document.body.appendChild(div);

  import("../ChatRoot").then(({ mountWidget }) => {
    mountWidget(div, chatConfig);
  });
}

window.chatInject = chatInject;

export {};
