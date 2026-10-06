export type ChatTheme = "light" | "dark";

export type ChatWidgetConfig = {
  api_key: string;
  bot_id: string;
  theme?: ChatTheme;
};

export type ChatWidgetConfigInput = Partial<
  Record<keyof ChatWidgetConfig, unknown>
>;

export function normalizeChatTheme(value: unknown): ChatTheme {
  return value === "dark" ? "dark" : "light";
}
