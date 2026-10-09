"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;

/** False while the server-rendered page is being attached in the browser, true afterwards. */
export const useHydrated = () =>
  useSyncExternalStore(subscribe, () => true, () => false);
