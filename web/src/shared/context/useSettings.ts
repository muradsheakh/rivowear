import { useContext } from "react";
import { SettingsContext } from "./settingsContext";

/** Store settings (WhatsApp number, delivery fees, ...). Null until loaded. */
export const useSettings = () => useContext(SettingsContext);
