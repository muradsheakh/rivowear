"use client";

import { useSyncExternalStore } from "react";
import { LAST_PHONE_KEY } from "./constants";

const subscribe = () => () => undefined;

/** The phone number used for this browser's last order (empty on the server and before it is known). */
export const useLastPhone = () =>
  useSyncExternalStore(subscribe, () => sessionStorage.getItem(LAST_PHONE_KEY) ?? "", () => "");
