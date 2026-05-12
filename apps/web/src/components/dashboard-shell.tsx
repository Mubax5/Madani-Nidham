"use client";

import {
  Bell,
  BarChart3,
  BadgeCheck,
  BookOpen,
  Bot,
  Calendar,
  CalendarCheck,
  ClipboardList,
  FileText,
  GalleryHorizontal,
  Globe,
  Heart,
  Image as ImageIcon,
  Landmark,
  LayoutDashboard,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  Send,
  Settings,
  ShieldCheck,
  Star,
  UserCog,
  Users,
  Wallet,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { apiFetch, clearToken, getToken } from "@/lib/api";
import {
  bottomNavigationConfig,
  navigationConfig,
  type NavigationItem,
} from "@/lib/navigation";
import { usePermissions } from "@/lib/use-permissions";

const iconMap = {
  LayoutDashboard,
  BarChart3,
  BadgeCheck,
  Bot,
  Users,
  CalendarCheck,
  BookOpen,
  Star,
  Moon,
  Image: ImageIcon,
  GalleryHorizontal,
  FileText,
  Bell,
  Calendar,
  ClipboardList,
  Heart,
  Wallet,
  UserCog,
  Settings,
  ShieldCheck,
  Globe,
  Receipt,
  Landmark,
};

function roleLabel(role: string) {
  const labels: Record<string, string> = {
    super_admin: "Super Admin",
    kepala_sekolah: "Kepala Sekolah",
    admin: "Admin",
    guru: "Guru/Wali Kelas",
    orang_tua: "Orang Tua",
  };
  return labels[role] ?? role;
}

type AiStudent = {
  id: number;
  fullName: string;
  nickname?: string | null;
  nis?: string | null;
  classes?: Array<{ id: number; name: string; level: string }>;
};

type AiMessage = {
  id?: number;
  role: "user" | "model";
  message: string;
  createdAt?: string;
  tokensUsed?: number | null;
  sourceLabel?: string | null;
};

type AiHistoryPayload = {
  room: "manager" | "student";
  student?: AiStudent | null;
  messages: AiMessage[];
  quota?: {
    dailyRequestLimit: number;
    remainingRequests: number;
    tokensPerMinuteLimit: number;
    requestsToday: number;
  };
};

function studentClass(student?: AiStudent | null) {
  return student?.classes?.[0]?.name ?? "Belum ada kelas";
}

function chatDateKey(value?: string) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "invalid";
  return date.toDateString();
}

function chatDateLabel(value?: string) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function chatTimeLabel(value?: string) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function TypingBubble() {
  return (
    <div className="max-w-[76%] rounded-2xl rounded-bl-md bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
      <div className="flex h-5 items-center gap-1.5">
        {[0, 1, 2].map((item) => (
          <span
            key={item}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#94a3b8]"
            style={{ animationDelay: `${item * 130}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function AiSuggestionChips({
  manager,
  onPick,
}: {
  manager: boolean;
  onPick: (value: string) => void;
}) {
  const items = manager
    ? [
        "Akun guru ada berapa?",
        "Siapa kepala sekolah?",
        "Ringkas keuangan bulan ini",
        "Berapa gaji guru?",
        "Absensi hari ini",
        "Daftar murid aktif",
        "PPDB 2026/2027",
      ]
    : [
        "Absensi anak bulan ini",
        "Jurnal terakhir",
        "Progress Montessori",
        "Hafalan terbaru",
        "Agenda minggu ini",
      ];

  return (
    <div className="border-t border-slate-200 bg-white px-3 py-2">
      <div className="flex gap-2 overflow-x-auto pb-0.5">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onPick(item)}
            className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-[#0a1f5c] transition hover:border-[#0a1f5c]/30 hover:bg-white"
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

function renderAiInline(text: string) {
  const parts = text.split(
    /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|_[^_]+_|\*[^*]+\*)/g,
  );
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("__") && part.endsWith("__"))
      return <u key={index}>{part.slice(2, -2)}</u>;
    if (part.startsWith("`") && part.endsWith("`"))
      return (
        <code
          key={index}
          className="rounded bg-slate-100 px-1 py-0.5 text-[12px] font-semibold text-[#0a1f5c]"
        >
          {part.slice(1, -1)}
        </code>
      );
    if (
      (part.startsWith("*") && part.endsWith("*")) ||
      (part.startsWith("_") && part.endsWith("_"))
    )
      return <em key={index}>{part.slice(1, -1)}</em>;
    return <span key={index}>{part}</span>;
  });
}

function AiRichMessage({ text }: { text: string }) {
  const lines = text.split(/\r?\n/);
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let listType: "ul" | "ol" | null = null;
  let tableRows: string[][] = [];

  function flushList(key: string) {
    if (!listType || listItems.length === 0) return;
    const className = "my-2 space-y-1.5 pl-4 marker:text-[#0a1f5c]/70";
    elements.push(
      listType === "ol" ? (
        <ol key={key} className={`${className} list-decimal`}>
          {listItems}
        </ol>
      ) : (
        <ul key={key} className={`${className} list-disc`}>
          {listItems}
        </ul>
      ),
    );
    listItems = [];
    listType = null;
  }

  function flushTable(key: string) {
    if (tableRows.length < 2) {
      tableRows = [];
      return;
    }
    const [head, ...body] = tableRows.filter(
      (row) => !row.every((cell) => /^:?-{2,}:?$/.test(cell.trim())),
    );
    elements.push(
      <div
        key={key}
        className="my-2 overflow-hidden rounded-xl border border-slate-200"
      >
        <table className="w-full text-left text-[12px]">
          <thead className="bg-slate-50 text-[#0a1f5c]">
            <tr>
              {head.map((cell, cellIndex) => (
                <th key={cellIndex} className="px-2 py-1.5 font-bold">
                  {renderAiInline(cell.trim())}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t border-slate-100">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-2 py-1.5 align-top">
                    {renderAiInline(cell.trim())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    );
    tableRows = [];
  }

  lines.forEach((raw, index) => {
    const line = raw.trim();
    const numbered = line.match(/^\d+[\).]\s+(.+)$/);
    const bullet = line.match(/^[-*]\s+(.+)$/);
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    const quote = line.match(/^>\s+(.+)$/);
    const table =
      line.startsWith("|") && line.endsWith("|")
        ? line.slice(1, -1).split("|")
        : null;

    if (!line) {
      flushList(`list-${index}`);
      flushTable(`table-${index}`);
      elements.push(<div key={`br-${index}`} className="h-1" />);
      return;
    }

    if (table) {
      flushList(`list-${index}-before-table`);
      tableRows.push(table);
      return;
    }

    flushTable(`table-${index}`);

    if (line === "---" || line === "***") {
      flushList(`list-${index}`);
      elements.push(<div key={index} className="my-2 h-px bg-slate-200" />);
      return;
    }

    if (heading) {
      flushList(`list-${index}`);
      elements.push(
        <p
          key={index}
          className="mb-1.5 text-[13px] font-extrabold leading-5 text-[#0a1f5c]"
        >
          {renderAiInline(heading[2])}
        </p>,
      );
      return;
    }

    if (quote) {
      flushList(`list-${index}`);
      elements.push(
        <div
          key={index}
          className="my-2 rounded-xl border-l-4 border-[#0a1f5c]/25 bg-slate-50 px-3 py-2 text-[13px] text-[#475569]"
        >
          {renderAiInline(quote[1])}
        </div>,
      );
      return;
    }

    if (numbered) {
      if (listType && listType !== "ol") flushList(`list-${index}-switch`);
      listType = "ol";
      listItems.push(
        <li key={index} className="pl-1">
          {renderAiInline(numbered[1])}
        </li>,
      );
      return;
    }

    if (bullet) {
      if (listType && listType !== "ul") flushList(`list-${index}-switch`);
      listType = "ul";
      listItems.push(
        <li key={index} className="pl-1">
          {renderAiInline(bullet[1])}
        </li>,
      );
      return;
    }

    flushList(`list-${index}`);
    elements.push(
      <p key={index} className="mb-1.5 last:mb-0">
        {renderAiInline(line)}
      </p>,
    );
  });

  flushList("list-end");
  flushTable("table-end");
  return (
    <div className="space-y-1 text-[13px] leading-6 [&_strong]:font-extrabold [&_strong]:text-[#0a1f5c]">
      {elements}
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiHidden, setAiHidden] = useState(false);
  const [aiStudents, setAiStudents] = useState<AiStudent[]>([]);
  const [aiStudentId, setAiStudentId] = useState("");
  const [aiInput, setAiInput] = useState("");
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
  const [aiQuota, setAiQuota] = useState<AiHistoryPayload["quota"]>();
  const [aiLoading, setAiLoading] = useState(false);
  const [aiHistoryLoading, setAiHistoryLoading] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [googleLinkLoading, setGoogleLinkLoading] = useState(false);
  const aiScrollRef = useRef<HTMLDivElement | null>(null);
  const aiInputRef = useRef<HTMLInputElement | null>(null);
  const permissions = usePermissions();
  const user = permissions.user;
  const canUseAi = permissions.can("use_ai_chat");
  const userId = user?.id;
  const isParent = user?.roles?.includes("orang_tua") ?? false;
  const isManagerAi =
    user?.roles?.some((role) =>
      ["super_admin", "kepala_sekolah", "admin"].includes(role),
    ) ?? false;

  useEffect(() => {
    setSidebarCollapsed(
      localStorage.getItem("madani_sidebar_collapsed") === "1",
    );
    setAiHidden(localStorage.getItem("madani_ai_hidden") === "1");
  }, []);

  useEffect(() => {
    if (!aiOpen || !userId || !canUseAi || !isParent) return;
    if (aiStudents.length > 0) return;
    apiFetch<AiStudent[]>(`/users/${userId}/children`)
      .then((response) => {
        setAiStudents(response.data);
        setAiStudentId(
          (current) =>
            current ||
            (response.data[0]?.id ? String(response.data[0].id) : ""),
        );
      })
      .catch(() => null);
  }, [aiOpen, aiStudents.length, canUseAi, isParent, userId]);

  useEffect(() => {
    if (!aiOpen || !userId || !canUseAi || (!isParent && !isManagerAi)) return;
    if (isParent && !aiStudentId) return;

    setAiHistoryLoading(true);
    const endpoint =
      isParent && aiStudentId
        ? `/ai/chat/my-history?studentId=${aiStudentId}`
        : "/ai/chat/my-history";

    apiFetch<AiHistoryPayload>(endpoint)
      .then((response) => {
        setAiMessages(response.data.messages ?? []);
        setAiQuota(response.data.quota);
        if (response.data.student?.id)
          setAiStudentId(String(response.data.student.id));
      })
      .catch(() => setAiMessages([]))
      .finally(() => setAiHistoryLoading(false));
  }, [aiOpen, aiStudentId, canUseAi, isManagerAi, isParent, userId]);

  useEffect(() => {
    if (!aiOpen) return;
    aiScrollRef.current?.scrollTo({
      top: aiScrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [aiMessages, aiLoading, aiOpen]);

  function toggleSidebar() {
    setSidebarCollapsed((current) => {
      const next = !current;
      localStorage.setItem("madani_sidebar_collapsed", next ? "1" : "0");
      return next;
    });
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }

    if (permissions.isError) {
      const status = (permissions.error as { status?: number } | null)?.status;
      if (status === 401 || status === 403) {
        clearToken();
        router.replace("/login");
      }
    }
  }, [permissions.error, permissions.isError, router]);

  useEffect(() => {
    if (!userId) return;

    const warmCoreRoutes = () => {
      [
        "/dashboard",
        "/students",
        "/attendance",
        "/fees",
        "/finance",
        "/teacher-payrolls",
        "/enrollment-updates",
      ].forEach((href) => router.prefetch(href));

      void import("@/components/fast-pages/dashboard-home");
      void import("@/components/fast-pages/students-page");
      void import("@/components/fast-pages/attendance-page");
      void import("@/components/fast-pages/fees-page");
      void import("@/components/fast-pages/finance-overview-page");
      void import("@/components/fast-pages/teacher-payrolls-page");
      void import("@/components/fast-pages/enrollment-updates-page");
    };

    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(warmCoreRoutes, { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }

    const id = setTimeout(warmCoreRoutes, 1200);
    return () => clearTimeout(id);
  }, [router, userId]);

  function logout() {
    apiFetch<null>("/auth/logout", { method: "POST" }).catch(() => null);
    clearToken();
    toast.success("Logout berhasil");
    router.replace("/login");
  }

  async function startGoogleLink() {
    setGoogleLinkLoading(true);
    try {
      const redirectUri = `${window.location.origin}/login`;
      const response = await apiFetch<{ url: string }>(
        `/auth/google/url?mode=link&redirectUri=${encodeURIComponent(redirectUri)}`,
      );
      window.location.href = response.data.url;
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Google OAuth belum dikonfigurasi",
      );
      setGoogleLinkLoading(false);
    }
  }

  function hideAi() {
    setAiOpen(false);
    setAiHidden(true);
    localStorage.setItem("madani_ai_hidden", "1");
  }

  function showAi() {
    setAiHidden(false);
    localStorage.setItem("madani_ai_hidden", "0");
    setAiOpen(true);
  }

  function pickAiSuggestion(value: string) {
    void sendAiMessage(value);
  }

  async function sendAiMessage(forcedMessage?: string) {
    const message = (forcedMessage ?? aiInput).trim();
    if (!message || aiLoading) return;
    if (isParent && !aiStudentId) {
      toast.error("Data anak belum tersedia untuk chat AI");
      return;
    }
    setAiInput("");
    const now = new Date().toISOString();
    setAiMessages((current) => [
      ...current,
      { role: "user", message, createdAt: now },
    ]);
    const quotaBeforeSend = aiQuota;
    if (quotaBeforeSend) {
      setAiQuota({
        ...quotaBeforeSend,
        requestsToday: quotaBeforeSend.requestsToday + 1,
        remainingRequests: Math.max(quotaBeforeSend.remainingRequests - 1, 0),
      });
    }
    setAiLoading(true);
    try {
      const response = await apiFetch<{
        reply: string;
        quota?: AiHistoryPayload["quota"];
        sourceLabel?: string | null;
      }>("/ai/chat", {
        method: "POST",
        body: isParent
          ? { studentId: Number(aiStudentId), message }
          : { message },
      });
      setAiMessages((current) => [
        ...current,
        {
          role: "model",
          message: response.data.reply,
          sourceLabel: response.data.sourceLabel,
          createdAt: new Date().toISOString(),
        },
      ]);
      if (response.data.quota) setAiQuota(response.data.quota);
    } catch (error) {
      if (quotaBeforeSend) setAiQuota(quotaBeforeSend);
      toast.error(error instanceof Error ? error.message : "Chat AI gagal");
    } finally {
      setAiLoading(false);
    }
  }

  const sidebarWidth = sidebarCollapsed ? 84 : 252;
  const navGroups = navigationConfig
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => permissions.can(item.permission)),
    }))
    .filter((group) => group.items.length > 0);
  const bottomNav = bottomNavigationConfig.filter((item) =>
    permissions.can(item.permission),
  );
  const normalizedPathname =
    pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const activeHref = [
    ...navGroups.flatMap((group) => group.items),
    ...bottomNav,
  ]
    .filter(
      (item) =>
        normalizedPathname === item.href ||
        normalizedPathname.startsWith(`${item.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const isActive = (item: NavigationItem) => item.href === activeHref;
  const selectedAiStudent = aiStudents.find(
    (student) => String(student.id) === aiStudentId,
  );
  const renderNavItem = (item: NavigationItem) => {
    const active = isActive(item);
    const Icon = iconMap[item.icon as keyof typeof iconMap] ?? LayoutDashboard;

    return (
      <Link
        key={item.href}
        href={item.href}
        prefetch={false}
        title={sidebarCollapsed ? item.label : undefined}
        className={`inline-flex min-h-9 shrink-0 items-center gap-2.5 rounded-xl px-2.5 text-[13px] font-semibold transition lg:w-full ${
          sidebarCollapsed ? "lg:justify-center lg:px-0" : ""
        } ${
          active
            ? "bg-white/95 text-[#0a1f5c]"
            : "text-white/74 hover:bg-white/10 hover:text-white"
        }`}
      >
        <Icon className="h-3.5 w-3.5" />
        <span className={sidebarCollapsed ? "lg:hidden" : ""}>
          {item.label}
        </span>
      </Link>
    );
  };

  return (
    <div
      className="min-h-dvh lg:grid"
      style={
        {
          "--madani-sidebar-offset": `${sidebarWidth}px`,
          gridTemplateColumns: `${sidebarWidth}px minmax(0, 1fr)`,
        } as React.CSSProperties
      }
    >
      <aside
        className={`madani-blue fixed inset-x-0 top-0 z-30 flex border-b border-white/10 px-3 py-2.5 text-white transition-[width] duration-200 lg:inset-y-0 lg:right-auto lg:h-dvh lg:flex-col lg:border-b-0 lg:border-r lg:px-4 lg:py-4 ${
          sidebarCollapsed ? "lg:w-[84px]" : "lg:w-[252px]"
        }`}
      >
        <div
          className={`flex items-center ${sidebarCollapsed ? "lg:justify-center" : "gap-3"}`}
        >
          <div
            className={`flex items-center ${sidebarCollapsed ? "lg:justify-center" : "gap-3"}`}
          >
            <Image
              src="/images/logo-madani-montessori.png"
              alt="Logo Madani"
              width={44}
              height={44}
              className="rounded-full border border-[#f5c542]/60 bg-white p-1"
            />
            <div className={sidebarCollapsed ? "lg:hidden" : ""}>
              <p className="font-display text-lg font-extrabold leading-none">
                Madani Nidham
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-white/66">
                Operasional Sekolah
              </p>
            </div>
          </div>
        </div>

        <nav className="madani-sidebar-scroll ml-3 flex flex-1 gap-1.5 overflow-x-auto pb-1 lg:ml-0 lg:mt-7 lg:grid lg:min-h-0 lg:content-start lg:gap-5 lg:overflow-x-hidden lg:overflow-y-auto lg:pb-4 lg:pr-1.5">
          {navGroups.map((group) => (
            <div key={group.label} className="grid shrink-0 gap-1.5 lg:shrink">
              <p
                className={`hidden px-2 text-[10px] font-bold uppercase tracking-[0.08em] text-white/42 lg:block ${sidebarCollapsed ? "lg:hidden" : ""}`}
              >
                {group.label}
              </p>
              <div className="flex gap-1.5 lg:grid">
                {group.items.map(renderNavItem)}
              </div>
            </div>
          ))}
        </nav>

        {bottomNav.length > 0 ? (
          <div className="hidden border-t border-white/10 pt-3 lg:mt-auto lg:grid lg:gap-2">
            {bottomNav.map(renderNavItem)}
          </div>
        ) : null}
      </aside>

      <main className="min-w-0 pt-[92px] lg:col-start-2 lg:min-h-dvh lg:pt-0">
        <header className="sticky top-0 z-20 hidden min-h-16 items-center justify-between border-b border-[#0a1f5c]/8 bg-white/92 px-6 backdrop-blur lg:flex">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleSidebar}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-[#0a1f5c] transition hover:border-[#0a1f5c]/20 hover:bg-slate-50"
              aria-label={
                sidebarCollapsed ? "Buka sidebar" : "Minimize sidebar"
              }
              title={sidebarCollapsed ? "Buka sidebar" : "Minimize sidebar"}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
            <div>
              <p className="text-xs font-semibold text-[#64748b]">
                Assalamualaikum
              </p>
              <h1 className="font-display text-xl font-extrabold text-[#0a1f5c]">
                {user?.name ?? "Madani Team"}
              </h1>
            </div>
          </div>
          <div className="group relative flex items-center">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#0a1f5c]/10 bg-white text-[#0a1f5c] transition hover:border-[#0a1f5c]/20"
              aria-label="Menu profil"
            >
              <UserCog className="h-4 w-4" />
            </button>
            <div className="invisible absolute right-0 top-11 z-30 w-64 translate-y-1 rounded-2xl border border-slate-200 bg-white p-2 opacity-0 shadow-[0_18px_45px_rgba(10,31,92,0.16)] transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
              <div className="border-b border-slate-100 px-3 py-2">
                <p className="truncate text-sm font-bold text-[#0a1f5c]">
                  {user?.name ?? "Profil"}
                </p>
                <p className="mt-0.5 truncate text-xs font-medium text-[#64748b]">
                  {user?.roles?.map(roleLabel).join(", ") ?? "Memuat"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProfileOpen(true)}
                className="mt-2 flex h-9 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold text-[#0a1f5c] transition hover:bg-slate-50"
              >
                <UserCog className="h-4 w-4" />
                Profil
              </button>
              <button
                type="button"
                onClick={logout}
                className="flex h-9 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </header>
        <div className="madani-compact-surface mx-auto w-full max-w-[1500px] px-3 py-3 sm:px-4 lg:px-5">
          {children}
        </div>
      </main>
      {profileOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 px-4">
          <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase text-[#64748b]">
                  Profil akun
                </p>
                <h2 className="font-display mt-1 text-2xl font-extrabold text-[#0a1f5c]">
                  {user?.name ?? "Profil"}
                </h2>
                <p className="mt-1 text-sm font-semibold text-[#64748b]">
                  {user?.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-[#0a1f5c] hover:bg-slate-50"
                aria-label="Tutup profil"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 grid gap-2">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                <span className="text-sm font-semibold text-[#0a1f5c]">
                  Email sistem
                </span>
                <span
                  className={`rounded-full px-2 py-1 text-[11px] font-bold ${
                    user?.emailVerifiedAt
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {user?.emailVerifiedAt ? "Terverifikasi" : "Belum"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                <span className="text-sm font-semibold text-[#0a1f5c]">
                  Login Google
                </span>
                <span
                  className={`rounded-full px-2 py-1 text-[11px] font-bold ${
                    user?.googleLinkedAt
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {user?.googleLinkedAt ? "Aktif" : "Belum aktif"}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={startGoogleLink}
              disabled={googleLinkLoading}
              className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0a1f5c] text-sm font-extrabold text-white transition hover:bg-[#123c8c] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <BadgeCheck className="h-4 w-4" />
              {googleLinkLoading
                ? "Membuka Google..."
                : user?.googleLinkedAt
                  ? "Verifikasi ulang Google"
                  : "Verifikasi email dengan Google"}
            </button>
            <p className="mt-3 text-xs leading-5 text-[#64748b]">
              Pakai akun Google dengan email yang sama. Google harus memberi
              status email terverifikasi.
            </p>
          </section>
        </div>
      ) : null}
      {canUseAi && !aiHidden ? (
        <div className="fixed bottom-4 right-4 z-40 lg:right-6">
          {aiOpen ? (
            <section className="mb-3 flex h-[min(680px,calc(100dvh-96px))] w-[min(520px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_54px_rgba(10,31,92,0.20)]">
              <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="font-bold text-[#0a1f5c]">Chat AI</p>
                  <p className="truncate text-xs text-[#64748b]">
                    {isManagerAi
                      ? "Room manajerial"
                      : selectedAiStudent
                        ? `${selectedAiStudent.fullName} / ${studentClass(selectedAiStudent)}`
                        : "Data anak belum tersedia"}
                  </p>
                  {aiQuota ? (
                    <p className="mt-1 text-[11px] font-semibold text-[#94a3b8]">
                      AI terbatas: {aiQuota.requestsToday}/
                      {aiQuota.dailyRequestLimit} request hari ini. Sisa{" "}
                      {aiQuota.remainingRequests}
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={hideAi}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-[#64748b]"
                    aria-label="Sembunyikan AI"
                  >
                    <PanelLeftClose className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiOpen(false)}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-[#64748b]"
                    aria-label="Tutup chat AI"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div
                ref={aiScrollRef}
                className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3"
                style={{
                  backgroundColor: "#DCDCDC",
                  backgroundPosition: "0 0, 0 0, 18px 31px, 18px 31px",
                  backgroundSize: "36px 62px",
                }}
              >
                {aiHistoryLoading ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white/88 p-3 text-xs leading-5 text-[#64748b]">
                    Memuat chat.
                  </div>
                ) : null}
                {aiMessages.map((item, index) => {
                  const currentDate = chatDateKey(item.createdAt);
                  const previousDate =
                    index > 0
                      ? chatDateKey(aiMessages[index - 1].createdAt)
                      : "";
                  const showDate = currentDate !== previousDate;

                  return (
                    <div key={`${item.id ?? index}-${item.role}`}>
                      {showDate ? (
                        <div className="my-3 flex justify-center">
                          <span className="rounded-full bg-white/92 px-3 py-1 text-[11px] font-semibold text-[#64748b] shadow-sm ring-1 ring-slate-200">
                            {chatDateLabel(item.createdAt)}
                          </span>
                        </div>
                      ) : null}
                      <div
                        className={`rounded-2xl px-3 py-2 text-sm leading-6 shadow-sm ${
                          item.role === "user"
                            ? "ml-auto max-w-[86%] rounded-br-md bg-[#0a1f5c] text-white"
                            : "max-w-[96%] rounded-bl-md bg-white text-[#334155] ring-1 ring-slate-200"
                        }`}
                      >
                        <AiRichMessage text={item.message} />
                        {item.role === "model" && item.sourceLabel ? (
                          <p className="mt-2 text-[10px] font-semibold text-[#94a3b8]">
                            {item.sourceLabel}
                          </p>
                        ) : null}
                        <p
                          className={`mt-1 text-right text-[10px] font-semibold ${item.role === "user" ? "text-white/65" : "text-[#94a3b8]"}`}
                        >
                          {chatTimeLabel(item.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {!aiHistoryLoading && aiMessages.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white/88 p-3 text-xs leading-5 text-[#64748b]">
                    Mulai chat dengan AI.
                  </div>
                ) : null}
                {aiLoading ? <TypingBubble /> : null}
              </div>
              <AiSuggestionChips
                manager={isManagerAi}
                onPick={pickAiSuggestion}
              />
              <form
                className="flex gap-2 border-t border-slate-200 p-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  sendAiMessage();
                }}
              >
                <input
                  ref={aiInputRef}
                  className="madani-input min-w-0 flex-1"
                  value={aiInput}
                  onChange={(event) => setAiInput(event.target.value)}
                  placeholder={
                    isManagerAi
                      ? "Tanya data sekolah"
                      : "Tanya perkembangan anak"
                  }
                  disabled={aiLoading || (isParent && !aiStudentId)}
                />
                <button
                  type="submit"
                  disabled={aiLoading || (isParent && !aiStudentId)}
                  className="grid h-9 w-9 place-items-center rounded-lg bg-[#0a1f5c] text-white disabled:opacity-50"
                  aria-label="Kirim chat AI"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </section>
          ) : null}
          <button
            type="button"
            onClick={() => setAiOpen((current) => !current)}
            className="ml-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#0a1f5c] text-white shadow-[0_14px_32px_rgba(10,31,92,0.24)]"
            aria-label="Buka chat AI"
          >
            <Bot className="h-5 w-5" />
          </button>
        </div>
      ) : canUseAi ? (
        <button
          type="button"
          onClick={showAi}
          className="fixed bottom-4 right-4 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-[#0a1f5c] shadow-sm lg:right-6"
          aria-label="Tampilkan chat AI"
        >
          <Bot className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
