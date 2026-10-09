"use client";

import { createContext } from "react";
import type { Settings } from "../api/client";

export const SettingsContext = createContext<Settings | null>(null);
