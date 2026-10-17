import { useEffect, useState } from "react";
import {
  DEFAULT_WIDGET_PROFILE,
  loadWidgetProfile,
  preloadAvatar,
} from "../../api/widgetProfile";

export function useWidgetProfile(apiKey: string, botId: string) {
  const key = `${botId}:${apiKey}`;
  const [state, setState] = useState({
    key,
    profile: DEFAULT_WIDGET_PROFILE,
    ready: false,
  });
  useEffect(() => {
    let active = true;
    void loadWidgetProfile(apiKey, botId)
      .then(async (profile) => ({
        ...profile,
        avatarUrl: await preloadAvatar(profile.avatarUrl),
      }))
      .catch(() => DEFAULT_WIDGET_PROFILE)
      .then((profile) => {
        if (active) setState({ key, profile, ready: true });
      });
    return () => {
      active = false;
    };
  }, [apiKey, botId, key]);
  // A different bot must never open using the previous bot's public profile.
  return state.key === key
    ? state
    : { key, profile: DEFAULT_WIDGET_PROFILE, ready: false };
}
