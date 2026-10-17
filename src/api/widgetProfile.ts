export type WidgetProfile = {
  id: string;
  name: string;
  instituteName: string | null;
  avatarUrl: string | null;
  supportEmail: string | null;
  supportTeamName: string | null;
  humanReplyMinutes: number | null;
  supportHours: string | null;
  helpCenterUrl: string | null;
};

export const DEFAULT_WIDGET_PROFILE: WidgetProfile = {
  id: "",
  name: "Chat assistant",
  instituteName: null,
  avatarUrl: null,
  supportEmail: null,
  supportTeamName: null,
  humanReplyMinutes: null,
  supportHours: null,
  helpCenterUrl: null,
};

const pending = new Map<string, Promise<WidgetProfile>>();
export function loadWidgetProfile(
  apiKey: string,
  botId: string,
): Promise<WidgetProfile> {
  const key = `${botId}:${apiKey}`;
  const existing = pending.get(key);
  if (existing) return existing;
  const request = fetch(
    `${import.meta.env.VITE_API_URL_BASE}/api/widget/config`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey, bot_id: botId }),
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    },
  )
    .then(async (response) => {
      if (!response.ok) throw new Error("Could not fetch widget profile");
      const { profile } = await response.json();
      if (
        !profile ||
        profile.id !== botId ||
        typeof profile.name !== "string"
      ) {
        throw new Error("Invalid widget profile");
      }
      return { ...DEFAULT_WIDGET_PROFILE, ...profile } as WidgetProfile;
    })
    .finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}

export function preloadAvatar(url: string | null): Promise<string | null> {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const image = new Image();
    const finish = (value: string | null) => {
      window.clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      resolve(value);
    };
    const timer = window.setTimeout(() => finish(null), 2500);
    image.onload = () => finish(url);
    image.onerror = () => finish(null);
    image.referrerPolicy = "no-referrer";
    image.src = url;
  });
}
