"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AUTH_CHANGED_EVENT,
  apiFetch,
  getAuthSessionKey,
  getToken,
} from "@/lib/api";

export type CurrentUser = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  photoUrl?: string | null;
  emailVerifiedAt?: string | null;
  googleLinkedAt?: string | null;
  lastLoginAt?: string | null;
  roles: string[];
  permissions: string[];
};

export function authMeQueryKey(sessionKey = getAuthSessionKey()) {
  return ["auth", sessionKey, "me"] as const;
}

export function usePermissions() {
  const [sessionKey, setSessionKey] = useState(() => getAuthSessionKey());

  useEffect(() => {
    const syncSession = () => setSessionKey(getAuthSessionKey());
    window.addEventListener(AUTH_CHANGED_EVENT, syncSession);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, syncSession);
  }, []);

  const hasToken = sessionKey !== "guest" && Boolean(getToken());
  const query = useQuery({
    queryKey: authMeQueryKey(sessionKey),
    queryFn: () => apiFetch<CurrentUser>("/auth/me"),
    enabled: hasToken,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const user = query.data?.data ?? null;
  const permissions = user?.permissions ?? [];
  const roles = user?.roles ?? [];

  return {
    user,
    permissions,
    roles,
    error: query.error,
    isError: query.isError,
    isLoading: query.isLoading,
    sessionKey,
    can: (permission: string) => permissions.includes(permission),
    hasRole: (role: string) => roles.includes(role),
  };
}
