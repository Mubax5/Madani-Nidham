"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch, getToken } from "@/lib/api";

export type CurrentUser = {
  id: number;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
};

export function usePermissions() {
  const hasToken = typeof window !== "undefined" && Boolean(getToken());
  const query = useQuery({
    queryKey: ["auth", "me"],
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
    can: (permission: string) => permissions.includes(permission),
    hasRole: (role: string) => roles.includes(role),
  };
}
