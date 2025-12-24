import { createRoot } from "react-dom/client";
import { StrictMode } from 'react'
import App from "./App";


export function mountWidget(div: HTMLElement, chatConfig: Record<string, unknown>) {
  createRoot(div).render(<StrictMode><App config={chatConfig} />{ console.log("running from chat root")}</StrictMode>)
}