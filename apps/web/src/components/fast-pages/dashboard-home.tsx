"use client";

/* eslint-disable @typescript-eslint/no-unused-vars */

import { ReactNode, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Banknote, Bell, CalendarDays, CalendarOff, Check, ChevronRight, ClipboardCheck, Moon, NotebookPen, Settings, Sparkles, Star, Trophy, UserRoundCog, Users, Wallet } from "lucide-react";
import { apiFetch, scopedQueryKey } from "@/lib/api";
import { usePermissions } from "@/lib/use-permissions";
import { EmptyState, StatusBadge, formatDate, formatMoney, statusLabel, type Agenda, type Announcement, type DashboardData } from "./workspace-shared";

const WeeklyAttendanceTrend = dynamic(() => import("./dashboard-charts").then((mod) => mod.WeeklyAttendanceTrend), { ssr: false, loading: () => <ChartLoading /> });
const MontessoriProgressChart = dynamic(() => import("./dashboard-charts").then((mod) => mod.MontessoriProgressChart), { ssr: false, loading: () => <ChartLoading /> });
const HafalanDonutChart = dynamic(() => import("./dashboard-charts").then((mod) => mod.HafalanDonutChart), { ssr: false, loading: () => <ChartLoading /> });

function ChartLoading() {
  return <div className="min-h-[220px] rounded-lg border border-dashed border-slate-200 bg-white p-4 text-xs font-semibold text-[#64748b]">Memuat grafik.</div>;
}


export function DashboardHome() {
  const [mounted, setMounted] = useState(false);
  const permissions = usePermissions();
  const { hasRole, can, sessionKey, user } = permissions;
  const isParentRole = hasRole("orang_tua");
  const { data, isLoading } = useQuery({
    queryKey: scopedQueryKey(["dashboard"]),
    queryFn: () => apiFetch<DashboardData>("/dashboard"),
    enabled: Boolean(user) && !isParentRole,
  });
  useEffect(() => setMounted(true), []);
  if (isParentRole) return <ParentDashboardHome />;
  const stats = data?.data;
  const totalStudents = stats?.totalActiveStudents ?? 0;
  const canSeeAbsenceRequests =
    hasRole("super_admin") ||
    hasRole("kepala_sekolah") ||
    hasRole("admin") ||
    hasRole("guru");
  const isTeacherOnly =
    hasRole("guru") &&
    !hasRole("super_admin") &&
    !hasRole("kepala_sekolah") &&
    !hasRole("admin");

  const daily = [
    {
      label: "Murid aktif",
      value: totalStudents,
      caption: "Semua murid berstatus aktif.",
    },
    {
      label: "Hadir hari ini",
      value: stats?.presentToday ?? 0,
      caption: "Absensi dengan status hadir.",
    },
    {
      label: "Tidak hadir",
      value: stats?.absentToday ?? 0,
      caption: "Izin, sakit, dan alfa hari ini.",
    },
    {
      label: "Jurnal hari ini",
      value: stats?.journalsToday ?? 0,
      caption: "Catatan guru dibuat hari ini.",
    },
  ];

  return (
    <div className="grid gap-4">
      <section className="rounded-2xl border border-[#0a1f5c]/10 bg-white px-5 py-6">
        <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#64748b]">
              Ringkasan Hari Ini
            </p>
            <h2 className="font-display mt-1 text-3xl font-extrabold text-[#0a1f5c]">
              Operasional Madani Nidham
            </h2>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {[
            {
              href: "/attendance",
              label: "Isi absensi",
              icon: <ClipboardCheck className="h-4 w-4" />,
            },
            {
              href: "/journals",
              label: "Jurnal",
              icon: <NotebookPen className="h-4 w-4" />,
            },
            {
              href: "/milestones",
              label: "Montessori",
              icon: <Sparkles className="h-4 w-4" />,
            },
            {
              href: "/hafalan",
              label: "Hafalan",
              icon: <Moon className="h-4 w-4" />,
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex min-h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-[#0a1f5c]/30 hover:bg-slate-50"
            >
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-[#0a1f5c] group-hover:bg-[#0a1f5c] group-hover:text-white">
                {item.icon}
              </span>
              <span className="text-sm font-semibold text-[#0a1f5c]">
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {daily.map((item) => (
          <article
            key={item.label}
            className="rounded-2xl border border-slate-200 bg-white p-4"
          >
            <p className="text-xs font-medium text-[#64748b]">{item.label}</p>
            <p className="font-display mt-1 text-3xl font-extrabold text-[#0a1f5c]">
              {isLoading ? "-" : item.value}
            </p>
            <p className="mt-2 text-[11px] font-medium leading-4 text-[#64748b]">
              {item.caption}
            </p>
          </article>
        ))}
      </section>

      <div className="border-t border-slate-200 pt-6">
        <DashboardSectionHeader title="Snapshot Hari Ini" />
        <section className={`grid items-start gap-4 ${canSeeAbsenceRequests ? "xl:grid-cols-2" : ""}`}>
          <DashboardAttendanceByClass
            rows={stats?.attendanceByClass ?? []}
            isLoading={isLoading}
          />
          {canSeeAbsenceRequests ? (
            <DashboardAbsenceRequests
              requests={stats?.todayAbsenceRequests ?? []}
              isLoading={isLoading}
            />
          ) : null}
        </section>

        <section id="analytics" className="mt-6 scroll-mt-20">
          <DashboardSectionHeader title="Analitik Akademik" />
          <div className="grid items-start gap-4 xl:grid-cols-[7fr_5fr]">
            <WeeklyAttendanceTrend
              mounted={mounted}
              rows={stats?.analytics?.attendanceTrend ?? []}
              totalStudents={totalStudents}
            />
            <div className="grid gap-4">
              <MontessoriProgressChart
                mounted={mounted}
                rows={stats?.analytics?.milestoneProgress ?? []}
              />
            <ActionItemList actionItems={stats?.actionItems} />
            </div>
          </div>
        </section>

        {!isTeacherOnly && (can("view_fees") || can("view_announcements")) ? (
          <section className="mt-6">
            <DashboardSectionHeader title="Keuangan & Operasional" />
            <div className="grid items-start gap-4 xl:grid-cols-[5fr_4fr_3fr]">
              {can("view_fees") ? <FinancialCategoryBreakdown finance={stats?.financeSummary} /> : null}
              <HafalanDonutChart
                mounted={mounted}
                rows={stats?.analytics?.hafalanProgress ?? []}
              />
              {can("view_announcements") ? (
                <DashboardAnnouncementList
                  announcements={stats?.recentAnnouncements ?? []}
                  isLoading={isLoading}
                />
              ) : null}
            </div>
          </section>
        ) : null}

        <section className="mt-6">
          <DashboardSectionHeader title="Kilas Tindak Lanjut" />
          <DashboardFollowUpGrid stats={stats} />
        </section>
      </div>
    </div>
  );
}

type ParentHomeData = {
  parent?: { name?: string; email?: string; phone?: string | null };
  children: Array<{ id: number; fullName: string; nickname?: string | null; programLabel?: string | null; classes?: Array<{ name: string; level: string }> }>;
  today: {
    date: string;
    attendance: Array<{ id: number; status: string; student?: { fullName?: string; nickname?: string | null } }>;
    absenceRequests: Array<{ id: number; type: string; status: string; reason?: string | null; student?: { fullName?: string } }>;
  };
  summary: { childrenCount: number; unreadNotifications: number; pendingFees: number; pendingAbsenceRequests: number };
  latestJournals: Array<{ id: number; date: string; content: string; student?: { fullName?: string; nickname?: string | null } }>;
  announcements: Array<{ id: number; title: string; publishedAt?: string | null }>;
  agendas: Array<{ id: number; title?: string; name?: string; startDate: string }>;
};

function ParentDashboardHome() {
  const { sessionKey, user, hasRole } = usePermissions();
  const { data, isLoading } = useQuery({
    queryKey: ["session", sessionKey, "parent-home"],
    queryFn: () => apiFetch<ParentHomeData>("/mobile/parent/home"),
    enabled: Boolean(user) && hasRole("orang_tua"),
  });
  const home = data?.data;
  const cards = [
    { label: "Anak", value: home?.summary.childrenCount ?? 0, caption: "Data anak terhubung" },
    { label: "Tagihan aktif", value: home?.summary.pendingFees ?? 0, caption: "Belum lunas / sebagian" },
    { label: "Izin diproses", value: home?.summary.pendingAbsenceRequests ?? 0, caption: "Menunggu konfirmasi" },
    { label: "Notifikasi", value: home?.summary.unreadNotifications ?? 0, caption: "Belum dibaca" },
  ];

  return (
    <div className="grid gap-4">
      <section className="rounded-lg border border-[#0a1f5c]/10 bg-white p-4">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#64748b]">Dashboard Orang Tua</p>
        <h2 className="font-display mt-1 text-3xl font-extrabold text-[#0a1f5c]">Data anak & informasi sekolah</h2>
        <p className="mt-1 text-sm text-[#64748b]">Mode orang tua hanya menampilkan data terpublikasi dan data anak yang terhubung.</p>
      </section>
      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((item) => (
          <article key={item.label} className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-[#64748b]">{item.label}</p>
            <p className="font-display mt-1 text-3xl font-extrabold text-[#0a1f5c]">{isLoading ? "-" : item.value}</p>
            <p className="mt-1 text-[11px] font-medium text-[#64748b]">{item.caption}</p>
          </article>
        ))}
      </section>
      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <DashboardCard title="Anak Terhubung" subtitle="Ringkasan kelas dan program">
          <div className="grid gap-2">
            {(home?.children ?? []).map((child) => (
              <div key={child.id} className="rounded-lg border border-slate-200 p-3">
                <p className="font-bold text-[#0a1f5c]">{child.fullName}</p>
                <p className="mt-1 text-xs text-[#64748b]">{child.classes?.[0]?.name ?? "Belum ada kelas"} / {child.programLabel ?? "Program belum diisi"}</p>
              </div>
            ))}
            {!isLoading && (home?.children ?? []).length === 0 ? <EmptyState text="Belum ada anak terhubung ke akun ini." /> : null}
          </div>
        </DashboardCard>
        <DashboardCard title="Hari Ini" subtitle="Absensi dan perizinan anak">
          <div className="grid gap-2">
            {(home?.today.attendance ?? []).map((item) => (
              <div key={`att-${item.id}`} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-sm font-semibold text-[#0a1f5c]">{item.student?.fullName ?? "Anak"}</span>
                <StatusBadge value={item.status} />
              </div>
            ))}
            {(home?.today.absenceRequests ?? []).map((item) => (
              <div key={`abs-${item.id}`} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-sm font-semibold text-amber-800">{item.student?.fullName ?? "Anak"} / {statusLabel(item.type)}</p>
                <p className="mt-0.5 text-xs text-amber-700">{item.reason ?? "Tanpa catatan."}</p>
              </div>
            ))}
            {!isLoading && (home?.today.attendance ?? []).length === 0 && (home?.today.absenceRequests ?? []).length === 0 ? <EmptyState text="Belum ada data hari ini." /> : null}
          </div>
        </DashboardCard>
      </section>
      <section className="grid gap-4 xl:grid-cols-3">
        <SimpleParentList title="Jurnal terbaru" rows={(home?.latestJournals ?? []).map((item) => ({ id: item.id, title: item.student?.fullName ?? "Jurnal", meta: formatDate(item.date), body: item.content }))} />
        <SimpleParentList title="Pengumuman" rows={(home?.announcements ?? []).map((item) => ({ id: item.id, title: item.title, meta: item.publishedAt ? formatDate(item.publishedAt) : "Aktif" }))} />
        <SimpleParentList title="Agenda" rows={(home?.agendas ?? []).map((item) => ({ id: item.id, title: item.title ?? item.name ?? "Agenda", meta: formatDate(item.startDate) }))} />
      </section>
    </div>
  );
}

function SimpleParentList({ title, rows }: { title: string; rows: Array<{ id: number; title: string; meta?: string; body?: string }> }) {
  return (
    <DashboardCard title={title} subtitle="Data terbaru">
      <div className="grid gap-2">
        {rows.slice(0, 5).map((row) => (
          <article key={row.id} className="rounded-lg border border-slate-200 p-3">
            <p className="line-clamp-1 font-semibold text-[#0a1f5c]">{row.title}</p>
            {row.meta ? <p className="mt-0.5 text-xs text-[#64748b]">{row.meta}</p> : null}
            {row.body ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#334155]">{row.body}</p> : null}
          </article>
        ))}
        {rows.length === 0 ? <EmptyState text="Belum ada data." /> : null}
      </div>
    </DashboardCard>
  );
}

type DashboardAttendanceRow = NonNullable<
  DashboardData["attendanceByClass"]
>[number];
type FinanceSummary = NonNullable<DashboardData["financeSummary"]>;
type FinanceCategory = FinanceSummary["categories"][number];
type ActionItems = NonNullable<DashboardData["actionItems"]>;
type TooltipPayload = {
  payload?: Record<string, unknown>;
  value?: number | string;
  name?: string;
};
type TooltipProps = {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string | number;
};

const academicColors = {
  hadir: "#10b981",
  izin: "#f59e0b",
  sakit: "#3b82f6",
  alfa: "#f43f5e",
  netral: "#94a3b8",
};

const montessoriColors: Record<string, string> = {
  "Practical Life": "#f59e0b",
  Sensorial: "#8b5cf6",
  Language: "#3b82f6",
  Mathematics: "#10b981",
  Culture: "#ef4444",
};

const financeColors = {
  masuk: "#10b981",
  keluar: "#f43f5e",
  net: "#3b82f6",
};

const hafalanColors: Record<string, string> = {
  mutqin: "#059669",
  lancar: "#34d399",
  sedang_dihafal: "#f59e0b",
  belum: "#e2e8f0",
};

function DashboardSectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
    </div>
  );
}

function DashboardCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`min-w-0 rounded-lg border border-slate-200 bg-white p-4 ${className}`}
    >
      <h3 className="mb-0.5 text-sm font-medium text-slate-950">{title}</h3>
      <p className="mb-3 text-xs leading-4 text-[#64748b]">{subtitle}</p>
      {children}
    </section>
  );
}

function DashboardAttendanceByClass({
  rows,
  isLoading,
}: {
  rows: DashboardAttendanceRow[];
  isLoading: boolean;
}) {
  return (
    <DashboardCard
      title="Kehadiran Hari Ini"
      subtitle="Status absensi murid aktif per kelas - diperbarui otomatis"
    >
      {rows.length > 0 ? (
        <div className="grid gap-2.5">
          <div className="grid grid-cols-[minmax(64px,0.85fr)_minmax(90px,1fr)_56px_32px] gap-1.5 text-[11px] font-semibold text-[#64748b] sm:grid-cols-[minmax(110px,1fr)_minmax(140px,1.2fr)_72px_42px] sm:gap-2">
            <span>Kelas</span>
            <span>Bar status</span>
            <span className="text-right">Total</span>
            <span className="text-right">%</span>
          </div>
          {rows.map((row) => {
            const total = Math.max(row.total, row.hadir + row.izin + row.sakit + row.alfa);
            const percent = total > 0 ? Math.round((row.hadir / total) * 100) : 0;
            const segments = [
              { key: "hadir", value: row.hadir, color: academicColors.hadir },
              { key: "izin", value: row.izin, color: academicColors.izin },
              { key: "sakit", value: row.sakit, color: academicColors.sakit },
              { key: "alfa", value: row.alfa, color: academicColors.alfa },
            ];

            return (
              <div
                key={row.id}
                className="grid grid-cols-[minmax(64px,0.85fr)_minmax(90px,1fr)_56px_32px] items-center gap-1.5 sm:grid-cols-[minmax(110px,1fr)_minmax(140px,1.2fr)_72px_42px] sm:gap-2"
              >
                <p className="min-w-0 truncate text-sm font-medium text-slate-900">
                  {row.name}
                </p>
                <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
                  {segments.map((segment) => (
                    <span
                      key={segment.key}
                      className="h-full"
                      style={{
                        width:
                          total > 0
                            ? `${Math.max((segment.value / total) * 100, 0)}%`
                            : "0%",
                        backgroundColor: segment.color,
                      }}
                    />
                  ))}
                </div>
                <span className="text-right text-[11px] text-[#64748b] sm:text-xs">
                  {row.hadir}/{total} hadir
                </span>
                <span
                  className={`text-right text-xs font-medium ${attendancePercentClass(percent)}`}
                >
                  {percent}%
                </span>
              </div>
            );
          })}
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-[#64748b]">
            {[
              ["Hadir", academicColors.hadir],
              ["Izin", academicColors.izin],
              ["Sakit", academicColors.sakit],
              ["Alfa", academicColors.alfa],
            ].map(([label, color]) => (
              <span key={label} className="inline-flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-[2px]"
                  style={{ backgroundColor: color }}
                />
                {label}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          text={
            isLoading
              ? "Memuat absensi per kelas."
              : "Belum ada data absensi per kelas hari ini."
          }
        />
      )}
    </DashboardCard>
  );
}

function DashboardAbsenceRequests({
  requests,
  isLoading,
}: {
  requests: NonNullable<DashboardData["todayAbsenceRequests"]>;
  isLoading: boolean;
}) {
  return (
    <DashboardCard
      title="Perizinan Orang Tua Hari Ini"
      subtitle="Izin dan sakit yang masuk dari orang tua"
    >
      {requests.length > 0 ? (
        <div className="grid">
          {requests.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 border-b border-slate-200/70 py-2.5 last:border-0"
            >
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-700">
                <CalendarOff className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="min-w-0 truncate text-sm font-medium text-slate-900">
                    {item.student?.fullName ?? "Murid"}
                  </p>
                  <StatusBadge value={item.status} />
                </div>
                <p className="mt-0.5 text-xs text-[#64748b]">
                  {statusLabel(item.type)} / {item.requester?.name ?? "Orang tua"}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-[#334155]">
                  {item.reason ?? "Tanpa catatan."}
                </p>
              </div>
            </div>
          ))}
          {requests.length > 6 ? (
            <Link
              href="/absence-requests"
              className="mt-2 inline-flex w-fit items-center gap-1 text-xs font-medium text-[#0a1f5c] hover:underline"
            >
              Lihat semua <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          ) : null}
        </div>
      ) : (
        <EmptyState
          text={
            isLoading
              ? "Memuat perizinan hari ini."
              : "Belum ada izin/sakit masuk hari ini."
          }
        />
      )}
    </DashboardCard>
  );
}

function DashboardAnnouncementList({
  announcements,
  isLoading,
}: {
  announcements: Announcement[];
  isLoading: boolean;
}) {
  return (
    <DashboardCard
      title="Pengumuman Aktif"
      subtitle="Informasi terbaru yang sudah dipublish"
    >
      {announcements.length > 0 ? (
        <div className="grid">
          {announcements.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 border-b border-slate-200/70 py-2.5 last:border-0"
            >
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
                <Bell className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {item.title}
                </p>
                <p className="mt-0.5 text-xs text-[#64748b]">
                  {item.publishedAt ? formatDate(item.publishedAt) : "Aktif"}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          text={
            isLoading ? "Memuat pengumuman." : "Belum ada pengumuman aktif."
          }
        />
      )}
    </DashboardCard>
  );
}

function FinancialCategoryBreakdown({
  finance,
}: {
  finance?: FinanceSummary;
}) {
  const categories = finance?.categories ?? [];
  const incomeRows = categories.filter((item) => item.type === "income");
  const expenseRows = categories.filter((item) => item.type === "expense");
  const unpaidCount = (finance?.unpaidCount ?? 0) + (finance?.partialCount ?? 0);
  const netCash = finance?.netCash ?? 0;

  return (
    <DashboardCard
      title="Arus Kas Bulan Ini"
      subtitle="Perbandingan uang masuk per kategori vs rencana pengeluaran - Mei 2026"
    >
      {categories.length > 0 ? (
        <div className="grid gap-3">
          <CashCategoryGroup label="MASUK" rows={incomeRows} type="income" />
          <div className="border-t border-slate-200" />
          <CashCategoryGroup label="KELUAR (rencana)" rows={expenseRows} type="expense" />
          <div className="flex flex-col gap-1 border-t border-slate-200 pt-3 sm:flex-row sm:items-end sm:justify-between">
            <p
              className={`text-sm font-semibold ${
                netCash >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              Net bulan ini: {netCash >= 0 ? "+" : "-"}
              {formatMoney(Math.abs(netCash))}
            </p>
            <p className="text-xs text-[#64748b]">
              {unpaidCount} tagihan belum dibayar / {formatMoney(finance?.outstanding)}
            </p>
          </div>
        </div>
      ) : (
        <EmptyState text="Belum ada ringkasan arus kas bulan ini." />
      )}
    </DashboardCard>
  );
}

function CashCategoryGroup({
  label,
  rows,
  type,
}: {
  label: string;
  rows: FinanceCategory[];
  type: "income" | "expense";
}) {
  return (
    <div className="grid gap-2.5">
      <p className="text-[11px] font-semibold text-[#64748b]">{label}</p>
      {rows.length > 0 ? (
        rows.map((row) => <CashCategoryRow key={`${row.label}-${row.type}`} row={row} type={type} />)
      ) : (
        <p className="text-xs text-[#64748b]">Belum ada data kategori.</p>
      )}
    </div>
  );
}

function CashCategoryRow({
  row,
  type,
}: {
  row: FinanceCategory;
  type: "income" | "expense";
}) {
  const amount = Math.abs(row.paid);
  const target = Math.max(row.target, 0);
  const progress = target > 0 ? Math.min(100, Math.round((amount / target) * 100)) : 0;
  const Icon = financeCategoryIcon(row.label);
  const color = type === "income" ? financeColors.masuk : financeColors.keluar;
  const bgColor = type === "income" ? "#d1fae5" : "#ffe4e6";

  return (
    <div className="grid grid-cols-[24px_minmax(88px,1fr)_minmax(92px,auto)] items-center gap-x-2 gap-y-1">
      <span className="grid h-6 w-6 place-items-center rounded-md bg-slate-100 text-slate-700">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs font-medium text-slate-900">{row.label}</p>
          <p className="shrink-0 text-xs font-medium text-slate-900">
            {formatMoney(amount)}
          </p>
        </div>
        <div
          className="mt-1 h-1 overflow-hidden rounded-full"
          style={{ backgroundColor: bgColor }}
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${progress}%`, backgroundColor: color }}
          />
        </div>
      </div>
      <p
        className="text-right text-xs font-medium"
        style={{ color }}
      >
        {progress}% {type === "income" ? "tertagih" : "dibayar"}
      </p>
    </div>
  );
}

function ActionItemList({ actionItems }: { actionItems?: ActionItems }) {
  const { can, hasRole } = usePermissions();
  const isTeacherOnly =
    hasRole("guru") &&
    !hasRole("super_admin") &&
    !hasRole("kepala_sekolah") &&
    !hasRole("admin");
  const items = [
    {
      label: "Izin absensi menunggu",
      count: actionItems?.absencePending ?? 0,
      href: "/absence-requests",
      color: "bg-rose-500",
      urgency: 1,
      visible: can("manage_absence_requests"),
    },
    {
      label: "Tagihan SPP belum dibayar",
      count: actionItems?.feesUnpaid ?? 0,
      href: "/fees",
      color: "bg-amber-400",
      urgency: 2,
      visible: can("view_fees") && !isTeacherOnly,
    },
    {
      label: "PPDB menunggu review",
      count: actionItems?.ppdbPending ?? 0,
      href: "/registrations",
      color: "bg-orange-500",
      urgency: 3,
      visible: can("view_registrations") && !isTeacherOnly,
    },
    {
      label: "Raport belum dipublish",
      count: actionItems?.reportsUnpublished ?? 0,
      href: "/reports",
      color: "bg-amber-400",
      urgency: 4,
      visible: can("view_reports"),
    },
  ].filter((item) => item.visible).sort((a, b) => a.urgency - b.urgency);
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <DashboardCard
      title="Perlu Perhatian"
      subtitle="Item yang membutuhkan tindakan hari ini"
    >
      {total > 0 ? (
        <div className="grid gap-1.5">
          {items.slice(0, 5).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-2 rounded-md px-2 py-2 transition hover:bg-slate-100"
            >
              <span className={`h-2 w-2 shrink-0 rounded-full ${item.color}`} />
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-800">
                {item.label}
              </span>
              <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 group-hover:bg-white">
                {item.count}
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            </Link>
          ))}
          <Link
            href="/analytics"
            className="mt-2 inline-flex w-fit items-center gap-1 text-xs font-medium text-[#0a1f5c] hover:underline"
          >
            Lihat semua analitik <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-3 text-xs font-medium text-emerald-700">
            <Check className="h-4 w-4" />
            Tidak ada yang perlu ditangani hari ini
          </div>
          <Link
            href="/analytics"
            className="inline-flex w-fit items-center gap-1 text-xs font-medium text-[#0a1f5c] hover:underline"
          >
            Lihat semua analitik <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </DashboardCard>
  );
}

function DashboardFollowUpGrid({ stats }: { stats?: DashboardData }) {
  const { can, hasRole } = usePermissions();
  const isTeacherOnly =
    hasRole("guru") &&
    !hasRole("super_admin") &&
    !hasRole("kepala_sekolah") &&
    !hasRole("admin");
  const attendanceRows = stats?.attendanceByClass ?? [];
  const incompleteAttendance = attendanceRows.filter((row) => {
    const recorded = row.hadir + row.izin + row.sakit + row.alfa;
    return row.total > recorded;
  });
  const finance = stats?.financeSummary;
  const actions = [
    { label: "Lengkapi absensi", value: `${incompleteAttendance.length} kelas`, href: "/attendance", visible: can("view_attendance") },
    { label: "Tagihan aktif", value: `${(finance?.unpaidCount ?? 0) + (finance?.partialCount ?? 0)} invoice`, href: "/fees", visible: can("view_fees") && !isTeacherOnly },
    { label: "Kas bersih", value: formatMoney(finance?.netCash), href: "/finance", visible: can("view_fees") && !isTeacherOnly },
    { label: "Audit kas", value: "Lihat transaksi", href: "/finance/audit", visible: can("view_fees") && !isTeacherOnly },
  ].filter((item) => item.visible);

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {actions.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="group rounded-lg border border-slate-200 bg-white p-4 transition hover:border-[#0a1f5c]/30 hover:bg-slate-50"
        >
          <p className="text-xs font-bold uppercase text-[#64748b]">{item.label}</p>
          <p className="font-display mt-1 text-xl font-extrabold text-[#0a1f5c]">{item.value}</p>
          <p className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#0a1f5c]">
            Buka menu <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </p>
        </Link>
      ))}
    </div>
  );
}

function attendancePercentClass(percent: number) {
  if (percent >= 80) return "text-emerald-600";
  if (percent >= 60) return "text-amber-600";
  return "text-rose-600";
}

function agendaTypeMeta(type: string) {
  const map = {
    libur: {
      icon: CalendarOff,
      className: "bg-rose-50 text-rose-600",
    },
    kegiatan: {
      icon: Star,
      className: "bg-amber-50 text-amber-600",
    },
    rapat: {
      icon: Users,
      className: "bg-blue-50 text-blue-600",
    },
    lomba: {
      icon: Trophy,
      className: "bg-violet-50 text-violet-600",
    },
    penerimaan: {
      icon: Star,
      className: "bg-amber-50 text-amber-600",
    },
    pengumuman: {
      icon: Bell,
      className: "bg-slate-100 text-slate-600",
    },
  };

  return map[type as keyof typeof map] ?? map.pengumuman;
}

function financeCategoryIcon(label: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes("spp")) return Wallet;
  if (normalized.includes("pendaftaran")) return BadgeCheck;
  if (normalized.includes("gaji")) return UserRoundCog;
  if (normalized.includes("operasional")) return Settings;
  return Banknote;
}

function relativeDayBadge(value?: string | null) {
  if (!value) return null;
  const date = parseDateOnly(value);
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((date.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Hari ini";
  if (diff === 1) return "Besok";
  return null;
}

function parseDateOnly(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function formatShortDayMonth(value?: string | null) {
  if (!value) return "-";
  const date = parseDateOnly(value);
  if (!date) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function chartNumber(value?: number | string) {
  return typeof value === "number" ? value : Number(value ?? 0);
}
