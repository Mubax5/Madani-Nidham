"use client";

import type { QueryClient } from "@tanstack/react-query";
import { apiFetch, scopedQueryKey } from "@/lib/api";

type RouterPrefetch = {
  prefetch: (href: string) => void;
};

type WarmQuery = {
  key: readonly unknown[];
  path: string;
};

export type NavWarmCache = {
  keys: Set<string>;
  paths: Map<string, Promise<unknown>>;
};

const workspaceRoutes = new Set([
  "/agendas",
  "/announcements",
  "/galleries",
  "/journals",
  "/milestones",
  "/registrations",
  "/reports",
  "/settings",
  "/users",
]);

const phaseRoutes = new Set([
  "/absence-requests",
  "/ai-chat",
  "/articles",
  "/hafalan",
  "/portfolios",
  "/settings/finance",
]);

let workspaceWarmup: Promise<unknown> | null = null;
let phaseWarmup: Promise<unknown> | null = null;
let dashboardChartsWarmup: Promise<unknown> | null = null;
let financeChartsWarmup: Promise<unknown> | null = null;

function todayInput() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function currentMonth() {
  return String(new Date().getMonth() + 1);
}

function currentYear() {
  return String(new Date().getFullYear());
}

function withQuery(path: string, params: Record<string, string | number>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== "") query.set(key, String(value));
  });
  const suffix = query.toString();
  return suffix ? `${path}?${suffix}` : path;
}

function warmPageBundle(href: string) {
  if (workspaceRoutes.has(href)) {
    workspaceWarmup ??= import("@/components/workspace-pages");
  }

  if (phaseRoutes.has(href)) {
    phaseWarmup ??= import("@/components/phase2-pages");
  }

  if (href === "/dashboard") {
    dashboardChartsWarmup ??= import("@/components/fast-pages/dashboard-charts");
  }

  if (href === "/finance") {
    financeChartsWarmup ??= import("@/components/fast-pages/finance-charts");
  }
}

function warmQueries(href: string): WarmQuery[] {
  const today = todayInput();
  const month = currentMonth();
  const year = currentYear();

  switch (href) {
    case "/dashboard":
      return [{ key: scopedQueryKey(["dashboard"]), path: "/dashboard" }];
    case "/students":
      return [
        {
          key: ["students", "", "active"],
          path: withQuery("/students", { status: "active", perPage: 100 }),
        },
        { key: ["classes", "options"], path: "/classes?perPage=100" },
      ];
    case "/attendance":
      return [
        {
          key: ["students", "attendance"],
          path: "/students?status=active&perPage=100",
        },
        {
          key: ["attendance", today],
          path: withQuery("/attendance", { date: today, perPage: 100 }),
        },
      ];
    case "/absence-requests":
      return [
        {
          key: ["absence-requests", "", ""],
          path: withQuery("/absence-requests", { perPage: 100 }),
        },
      ];
    case "/journals":
      return [
        {
          key: ["students", "journal"],
          path: "/students?status=active&perPage=100",
        },
        {
          key: ["journals", today],
          path: withQuery("/journals", { date: today, perPage: 100 }),
        },
      ];
    case "/milestones":
      return [
        {
          key: ["students", "milestone-options"],
          path: "/students?status=active&perPage=100",
        },
        { key: ["montessori-areas"], path: "/montessori/areas" },
      ];
    case "/hafalan":
      return [
        { key: ["students", "hafalan"], path: "/students?perPage=100" },
        { key: ["hafalan-surahs"], path: "/hafalan/surahs" },
      ];
    case "/portfolios":
      return [
        {
          key: ["students", "portfolio-options"],
          path: "/students?perPage=100",
        },
        { key: ["portfolios"], path: "/portfolios?perPage=100" },
      ];
    case "/reports":
      return [
        { key: ["reports"], path: "/reports?perPage=100" },
        {
          key: ["students", "report-options"],
          path: "/students?perPage=100",
        },
        { key: ["academic-years", "report-options"], path: "/academic-years" },
      ];
    case "/announcements":
      return [
        { key: ["announcements"], path: "/announcements?perPage=100" },
        {
          key: ["classes", "announcement-options"],
          path: "/classes?perPage=100",
        },
        { key: ["users", "parent-options"], path: "/users?perPage=100" },
      ];
    case "/agendas":
      return [
        {
          key: ["agendas", month, year],
          path: withQuery("/agendas", { month, year }),
        },
      ];
    case "/galleries":
      return [{ key: ["galleries"], path: "/galleries?perPage=100" }];
    case "/articles":
      return [{ key: ["articles"], path: "/articles?perPage=100" }];
    case "/registrations":
      return [
        { key: ["registrations"], path: "/registrations?perPage=100" },
        {
          key: ["classes", "registration-options"],
          path: "/classes?perPage=100",
        },
      ];
    case "/finance":
      return [{ key: ["finance-overview"], path: "/finance/overview" }];
    case "/fees":
      return [
        {
          key: ["fees", "", ""],
          path: withQuery("/fees", { perPage: 100 }),
        },
        { key: ["fees-summary"], path: "/fees/summary" },
        { key: ["school-accounts", "fees"], path: "/school-accounts" },
      ];
    case "/enrollment-updates":
      return [
        {
          key: ["enrollment-updates", "", "", ""],
          path: "/enrollment-updates",
        },
        {
          key: ["enrollment-updates-summary"],
          path: "/enrollment-updates/summary",
        },
      ];
    case "/teacher-payrolls":
      return [
        {
          key: ["teacher-payrolls", month, year],
          path: withQuery("/finance/payrolls", { month, year, perPage: 100 }),
        },
        { key: ["payroll-teachers"], path: "/finance/payroll-teachers" },
      ];
    case "/settings/finance":
      return [
        { key: ["fee-types"], path: "/fee-types" },
        { key: ["school-accounts"], path: "/school-accounts" },
      ];
    case "/settings":
      return [
        { key: ["settings"], path: "/settings" },
        { key: ["academic-years", "settings"], path: "/academic-years" },
      ];
    case "/users":
      return [{ key: ["users"], path: "/users?perPage=100" }];
    case "/ai-chat":
      return [
        {
          key: ["ai-histories", { userId: "", studentId: "", date: "" }],
          path: withQuery("/ai/chat/histories", { perPage: 100 }),
        },
        { key: ["ai-usage"], path: "/ai/chat/usage" },
      ];
    default:
      return [];
  }
}

export function warmNavAssets(router: RouterPrefetch, href: string) {
  router.prefetch(href);
  warmPageBundle(href);
}

export function warmNavData(
  queryClient: QueryClient,
  href: string,
  cache: NavWarmCache,
) {
  const jobs = warmQueries(href).map((query) => {
    const cacheKey = JSON.stringify(query.key);
    if (cache.keys.has(cacheKey)) return Promise.resolve();

    cache.keys.add(cacheKey);
    let request = cache.paths.get(query.path);
    if (!request) {
      request = apiFetch(query.path).catch((error) => {
        cache.paths.delete(query.path);
        throw error;
      });
      cache.paths.set(query.path, request);
    }

    return request
      .then((data) => {
        queryClient.setQueryData(query.key, data);
      })
      .catch(() => {
        cache.keys.delete(cacheKey);
      });
  });

  return Promise.all(jobs).then(() => undefined);
}

export function warmNavTarget(
  router: RouterPrefetch,
  queryClient: QueryClient,
  href: string,
  cache: NavWarmCache,
) {
  warmNavAssets(router, href);
  return warmNavData(queryClient, href, cache);
}
