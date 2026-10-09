"use client";

import { useEffect, useState, type PropsWithChildren } from "react";
import { api, type Settings } from "../api/client";
import { SettingsContext } from "./settingsContext";

/** `initial` comes from the server, so the WhatsApp button and menus are present in the first HTML. */
export const SettingsProvider = ({ initial, children }: PropsWithChildren<{ initial: Settings | null }>) => {
  const [settings, setSettings] = useState<Settings | null>(initial);
  useEffect(() => {
    if (!initial) api.settings().then((response) => setSettings(response.settings)).catch(() => undefined);
  }, [initial]);
  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
};
