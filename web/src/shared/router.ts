"use client";

import {
  useParams as useNextParams,
  usePathname,
  useRouter,
  useSearchParams as useNextSearchParams,
} from "next/navigation";
import { useCallback, useMemo } from "react";

/** Small helpers that give Next.js navigation a simple shape used across the app. */

export const useNavigate = () => {
  const router = useRouter();
  return useCallback(
    (to: string, options?: { replace?: boolean }) => (options?.replace ? router.replace(to) : router.push(to)),
    [router],
  );
};

export const useSearchParams = (): [URLSearchParams, (next: URLSearchParams, options?: { replace?: boolean }) => void] => {
  const current = useNextSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const query = current.toString();
  const params = useMemo(() => new URLSearchParams(query), [query]);
  const set = useCallback(
    (next: URLSearchParams, options?: { replace?: boolean }) => {
      const qs = next.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      if (options?.replace) router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    },
    [pathname, router],
  );
  return [params, set];
};

export const useParams = () => useNextParams() as Record<string, string | undefined>;

/** Only same-site paths are accepted as a "go back to" target (blocks open redirects). */
export const safePath = (value: string | null | undefined): string | null =>
  value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : null;
