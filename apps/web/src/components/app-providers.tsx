"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { AUTH_CHANGED_EVENT } from "@/lib/api";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: false,
            staleTime: 5 * 60 * 1000,
            gcTime: 15 * 60 * 1000,
          },
        },
      }),
  );

  useEffect(() => {
    const clearSessionCache = () => queryClient.clear();
    window.addEventListener(AUTH_CHANGED_EVENT, clearSessionCache);
    return () =>
      window.removeEventListener(AUTH_CHANGED_EVENT, clearSessionCache);
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
