"use client";

import { useCallback, useEffect, useState } from "react";

export function useQuery<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  const reload = useCallback(() => {
    setRefreshCount((count) => count + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function run() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Request failed");
        }

        const result = (await response.json()) as T;

        if (!isMounted) {
          return;
        }

        setData(result);
      } catch {
        if (!isMounted) {
          return;
        }

        setError("Request failed");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void run();

    return () => {
      isMounted = false;
    };
  }, [refreshCount, url]);

  return { data, isLoading, error, reload };
}
