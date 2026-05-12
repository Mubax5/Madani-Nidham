"use client";

/* eslint-disable @next/next/no-img-element */

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronRight, Save, Search, Upload, X } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";
import { apiFetch, ApiResponse } from "@/lib/api";
import { formatRupiah } from "@/lib/format-currency";

export type Role = string | { name: string };

export type User = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  isActive?: boolean;
  roles?: Role[];
};

export type AcademicYear = {
  id: number;
  name: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
};

export type SchoolClass = {
  id: number;
  name: string;
  level: string;
  capacity?: number;
  studentsCount?: number;
  academicYear?: AcademicYear | null;
  teacher?: User | null;
};

export type Student = {
  id: number;
  nis?: string | null;
  fullName: string;
  nickname?: string | null;
  birthDate?: string | null;
  birthPlace?: string | null;
  gender?: "L" | "P" | string;
  photoUrl?: string | null;
  address?: string | null;
  joinDate?: string | null;
  programType?: "regular" | "half_day" | "full_day" | string;
  programLabel?: string | null;
  status?: string;
  parents?: User[];
  classes?: SchoolClass[];
};

export type Attendance = {
  id: number;
  date: string;
  status: AttendanceStatus;
  notes?: string | null;
  checkInTime?: string | null;
  studentId?: number;
  classId?: number;
  student?: Student | null;
  class?: SchoolClass | null;
};

export type AttendanceStatus = "hadir" | "izin" | "sakit" | "alfa";

export type Journal = {
  id: number;
  date: string;
  content: string;
  mood?: string | null;
  isPublished?: boolean;
  student?: Student | null;
  class?: SchoolClass | null;
  teacher?: User | null;
};

export type MontessoriArea = {
  id: number;
  name: string;
  description?: string | null;
  sortOrder?: number;
  milestones?: MontessoriMilestone[];
  milestoneCount?: number;
  masteredCount?: number;
};

export type MontessoriMilestone = {
  id: number;
  areaId?: number;
  name: string;
  description?: string | null;
  level?: string | null;
  ageMinMonths?: number | null;
  ageMaxMonths?: number | null;
  sortOrder?: number;
  area?: MontessoriArea | null;
  studentStatus?: MilestoneStatus;
  observationNotes?: string | null;
  observedAt?: string | null;
};

export type MilestoneStatus =
  | "not_started"
  | "introduced"
  | "in_progress"
  | "mastered";

export type Report = {
  id: number;
  semester: string;
  generalNotes?: string | null;
  characterNotes?: string | null;
  recommendation?: string | null;
  signatureStatus?: string | null;
  publishedAt?: string | null;
  pdfUrl?: string | null;
  student?: Student | null;
  class?: SchoolClass | null;
  academicYear?: AcademicYear | null;
};

export type Announcement = {
  id: number;
  title: string;
  content?: string | null;
  target: string;
  targetClassIds?: number[] | null;
  targetUserIds?: number[] | null;
  isUrgent?: boolean;
  publishedAt?: string | null;
};

export type Agenda = {
  id: number;
  title: string;
  description?: string | null;
  startDate: string;
  endDate?: string | null;
  location?: string | null;
  type: string;
  affectsAttendance?: boolean;
};

export type Registration = {
  id: number;
  registrationNumber: string;
  childName: string;
  childBirthDate?: string | null;
  childGender?: string | null;
  programApplied?: string | null;
  parentName: string;
  parentPhone?: string | null;
  parentEmail?: string | null;
  address?: string | null;
  status: RegistrationStatus;
  reviewerNotes?: string | null;
  documentUrls?: Array<{ name?: string; url?: string }>;
  convertedStudentId?: number | null;
};

export type RegistrationStatus =
  | "pending"
  | "under_review"
  | "accepted"
  | "rejected"
  | "waitlist";

export type EnrollmentCategory =
  | "new_student"
  | "re_registration"
  | "graduated"
  | "prep_class"
  | "not_continuing"
  | "unconfirmed";

export type EnrollmentPaymentStatus =
  | "unpaid"
  | "partial"
  | "paid"
  | "not_applicable";

export type EnrollmentConfirmationStatus =
  | "pending"
  | "confirmed"
  | "graduated"
  | "continuing"
  | "not_continuing"
  | "unconfirmed";

export type EnrollmentUpdate = {
  id: number;
  category: EnrollmentCategory;
  fullName: string;
  programLevel?: string | null;
  address?: string | null;
  targetAmount?: number | null;
  paidAmount: number;
  outstandingAmount: number;
  isFinancial: boolean;
  paymentStatus: EnrollmentPaymentStatus;
  confirmationStatus: EnrollmentConfirmationStatus;
  sourceText?: string | null;
  notes?: string | null;
  student?: Student | null;
  registration?: Registration | null;
};

export type EnrollmentSummary = {
  totalCount: number;
  financialCount: number;
  target: number;
  paid: number;
  outstanding: number;
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
};

export type SettingRow = {
  id?: number;
  key: string;
  value: unknown;
  type?: string;
};

export type DashboardData = {
  totalActiveStudents: number;
  presentToday: number;
  absentToday: number;
  totalClasses: number;
  journalsToday: number;
  pendingRegistrations: number;
  attendanceByClass?: Array<{
    id: number;
    name: string;
    level?: string;
    capacity?: number;
    hadir: number;
    izin: number;
    sakit: number;
    alfa: number;
    total: number;
  }>;
  attendanceThisWeek: Array<{ day: string; hadir: number; tidakHadir: number }>;
  todayAbsenceRequests?: Array<{
    id: number;
    date: string;
    type: "izin" | "sakit" | string;
    reason?: string | null;
    status: string;
    student?: Student | null;
    requester?: User | null;
  }>;
  upcomingAgendas: Agenda[];
  recentAnnouncements: Announcement[];
  actionItems?: {
    absencePending: number;
    feesUnpaid: number;
    ppdbPending: number;
    reportsUnpublished: number;
    journalsMissingToday: number;
  };
  financeSummary?: {
    target: number;
    paid: number;
    outstanding: number;
    cashIn: number;
    cashOut: number;
    netCash: number;
    plannedExpense: number;
    overdueCount: number;
    partialCount: number;
    unpaidCount: number;
    paidCount: number;
    categories: Array<{
      key?: string;
      label: string;
      type: "income" | "expense";
      target: number;
      paid: number;
      outstanding: number;
      count: number;
    }>;
  };
  analytics?: {
    attendanceTrend: Array<{
      week: string;
      weekNumber?: number;
      label?: string;
      startDate?: string;
      endDate?: string;
      range?: string;
      hadir: number;
      tidakHadir: number;
      total?: number;
      ratio?: number;
    }>;
    attendanceDistribution: Array<{ status: string; total: number }>;
    milestoneProgress: Array<{
      name?: string;
      area?: string;
      total: number;
      mastered: number;
      pct?: number;
    }>;
    hafalanProgress: Array<{
      status: string;
      label?: string;
      total: number;
      pct?: number;
    }>;
    feeCollection: Array<{ month: number; target: number; paid: number }>;
    financeBreakdown: Array<{ label: string; type: string; target: number; paid: number; outstanding: number }>;
    studentsPerClass: Array<{
      name: string;
      level?: string;
      studentsCount: number;
      capacity?: number;
    }>;
  };
};

export const levelOptions = ["KB", "TK A", "TK B", "TK C"];
export const programOptions = [
  {
    value: "regular",
    label: "Reguler",
    schedule: "Senin-Kamis 07.30-10.30, Jumat 07.30-10.00",
  },
  {
    value: "half_day",
    label: "Half Day",
    schedule: "Senin-Kamis 07.30-13.00, Jumat 07.30-12.30",
  },
  {
    value: "full_day",
    label: "Full Day",
    schedule: "Senin-Kamis 07.30-16.00, Jumat 07.30-15.30",
  },
];
export const attendanceOptions: AttendanceStatus[] = [
  "hadir",
  "izin",
  "sakit",
  "alfa",
];
export const emptyList: unknown[] = [];
export const milestoneOptions: MilestoneStatus[] = [
  "not_started",
  "introduced",
  "in_progress",
  "mastered",
];
export const registrationStatuses: RegistrationStatus[] = [
  "pending",
  "under_review",
  "accepted",
  "waitlist",
  "rejected",
];
export const enrollmentCategories: Array<{
  value: EnrollmentCategory | "";
  label: string;
}> = [
  { value: "", label: "Semua" },
  { value: "new_student", label: "Siswa baru" },
  { value: "re_registration", label: "Daftar ulang" },
  { value: "graduated", label: "Lulus" },
  { value: "prep_class", label: "TK C/Persiapan" },
  { value: "not_continuing", label: "Tidak lanjut" },
  { value: "unconfirmed", label: "Belum konfirmasi" },
];
export const enrollmentPaymentStatuses: EnrollmentPaymentStatus[] = [
  "unpaid",
  "partial",
  "paid",
  "not_applicable",
];
export const enrollmentConfirmationStatuses: EnrollmentConfirmationStatus[] = [
  "pending",
  "confirmed",
  "graduated",
  "continuing",
  "not_continuing",
  "unconfirmed",
];
export const settingsTabKeys = ["years", "documents", "signature"] as const;
export type SettingsTabKey = (typeof settingsTabKeys)[number];

export function todayInput() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

export function currentMonth() {
  return new Date().getMonth() + 1;
}

export function currentYear() {
  return new Date().getFullYear();
}

export function listFrom<T>(response?: ApiResponse<T[]>): T[] {
  return Array.isArray(response?.data) ? response.data : (emptyList as T[]);
}

export function buildQuery(
  path: string,
  params: Record<string, string | number | undefined>,
) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export function formatDate(value?: string | null) {
  if (!value) return "-";
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = dateOnly
    ? new Date(
        Number(dateOnly[1]),
        Number(dateOnly[2]) - 1,
        Number(dateOnly[3]),
      )
    : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatMoney(value?: number | null) {
  return `Rp ${Number(value ?? 0).toLocaleString("id-ID")}`;
}

export function compactMoney(value?: number | null) {
  return formatRupiah(Number(value ?? 0), true);
}

export function roleNames(user?: User | null) {
  return (user?.roles ?? [])
    .map((role) => (typeof role === "string" ? role : role.name))
    .filter(Boolean);
}

export function roleLabel(role: string) {
  const labels: Record<string, string> = {
    super_admin: "Super Admin",
    kepala_sekolah: "Kepala Sekolah",
    admin: "Admin",
    guru: "Guru/Wali Kelas",
    orang_tua: "Orang Tua",
  };
  return labels[role] ?? role;
}

export function statusLabel(value?: string | null) {
  const labels: Record<string, string> = {
    active: "Aktif",
    inactive: "Nonaktif",
    alumni: "Alumni",
    hadir: "Hadir",
    izin: "Izin",
    sakit: "Sakit",
    alfa: "Alfa",
    not_started: "Belum mulai",
    introduced: "Dikenalkan",
    in_progress: "Latihan",
    mastered: "Tuntas",
    pending: "Pending",
    under_review: "Ditinjau",
    accepted: "Diterima",
    rejected: "Ditolak",
    waitlist: "Waiting List",
    new_student: "Siswa baru",
    re_registration: "Daftar ulang",
    graduated: "Lulus",
    prep_class: "TK C/Persiapan",
    not_continuing: "Tidak lanjut",
    unconfirmed: "Belum konfirmasi",
    confirmed: "Terkonfirmasi",
    continuing: "Lanjut",
    paid: "Lunas",
    partial: "Partial",
    unpaid: "Belum bayar",
    not_applicable: "Non-keuangan",
    visual_signed: "Tanda tangan visual",
    kegiatan: "Kegiatan",
    libur: "Libur",
    rapat: "Rapat",
    lomba: "Lomba",
    penerimaan: "Penerimaan",
    belum: "Belum",
    sedang_dihafal: "Sedang dihafal",
    lancar: "Lancar",
    mutqin: "Mutqin",
  };
  return labels[value ?? ""] ?? value ?? "-";
}

export function normalizeLevel(value?: string | null) {
  const labels: Record<string, string> = {
    KB: "KB",
    TKA: "TK A",
    "TK A": "TK A",
    TKB: "TK B",
    "TK B": "TK B",
    TKC: "TK C",
    "TK C": "TK C",
  };
  return labels[value ?? ""] ?? value ?? "-";
}

export function classLabel(item?: SchoolClass | null) {
  if (!item) return "-";
  const level = normalizeLevel(item.level);
  return item.name === level || !item.level
    ? item.name
    : `${item.name} / ${level}`;
}

export function studentClass(student: Student) {
  return student.classes?.[0]?.name ?? "Belum masuk kelas";
}

export function firstParent(student: Student) {
  return student.parents?.[0];
}

export function studentLevel(student: Student) {
  return normalizeLevel(student.classes?.[0]?.level);
}

export function initials(value?: string | null) {
  return (value ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase())
    .join("") || "M";
}

export function matchesLevel(value?: string | null, filter?: string) {
  if (!filter) return true;
  return normalizeLevel(value) === filter;
}

export function levelTabs<T>(
  source: T[],
  getLevel: (item: T) => string | null | undefined,
) {
  return [
    { value: "", label: "Semua", count: source.length },
    ...levelOptions.map((level) => ({
      value: level,
      label: level,
      count: source.filter((item) => matchesLevel(getLevel(item), level))
        .length,
    })),
  ];
}

export function settingValue(settings: SettingRow[], key: string, fallback = "") {
  const row = settings.find((item) => item.key === key);
  if (!row) return fallback;
  const value = row.value;
  if (value && typeof value === "object" && "value" in value) {
    const inner = (value as { value?: unknown }).value;
    return Array.isArray(inner) ? inner.join("\n") : String(inner ?? fallback);
  }
  return Array.isArray(value) ? value.join("\n") : String(value ?? fallback);
}

export function useList<T>(key: unknown[], endpoint: string, enabled = true) {
  return useQuery({
    queryKey: key,
    queryFn: () => apiFetch<T[]>(endpoint),
    enabled,
    retry: false,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useSafeList<T>(key: unknown[], endpoint: string, enabled = true) {
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      try {
        return await apiFetch<T[]>(endpoint);
      } catch {
        return { success: true, message: "", data: [] } as ApiResponse<T[]>;
      }
    },
    enabled,
    retry: false,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function PageHeader({
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  if (!children) return null;

  return (
    <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-2.5">
      <div className="flex w-full flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        {children}
      </div>
    </section>
  );
}

export function Breadcrumbs({
  items,
}: {
  items: Array<{ label: string; href?: string }>;
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex min-w-0 flex-wrap items-center gap-1 text-xs font-semibold text-[#64748b]"
    >
      {items.map((item, index) => (
        <span
          key={`${item.label}-${index}`}
          className="inline-flex min-w-0 items-center gap-1"
        >
          {index > 0 ? (
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          ) : null}
          {item.href ? (
            <Link href={item.href} className="text-[#0a1f5c] hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="max-w-[260px] truncate">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function Panel({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-lg border border-slate-200 bg-white">
      <div className="flex min-h-10 flex-col gap-1.5 border-b border-slate-100 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-[13px] font-bold text-[#0a1f5c]">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-[11px] leading-4 text-[#64748b]">
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="min-w-0 p-3">{children}</div>
    </section>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs font-medium text-[#64748b]">
      {text}
    </div>
  );
}

export function CategoryTabs({
  items,
  value,
  onChange,
}: {
  items: Array<{ value: string; label: string; count?: number }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value || item.label}
            type="button"
            onClick={() => onChange(item.value)}
            className={`shrink-0 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
              active
                ? "border-[#0a1f5c] bg-[#0a1f5c] text-white"
                : "border-slate-200 bg-white text-[#334155] hover:border-[#0a1f5c]/30"
            }`}
          >
            {item.label}
            {typeof item.count === "number" ? (
              <span
                className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-white/16 text-white" : "bg-slate-100 text-[#64748b]"}`}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function StatusBadge({ value }: { value?: string | null }) {
  const color =
    value === "hadir" ||
    value === "accepted" ||
    value === "active" ||
    value === "mastered" ||
    value === "visual_signed" ||
    value === "paid" ||
    value === "confirmed" ||
    value === "graduated" ||
    value === "continuing"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : value === "alfa" ||
          value === "rejected" ||
          value === "inactive" ||
          value === "not_continuing"
        ? "bg-rose-50 text-rose-700 border-rose-200"
      : value === "pending" ||
            value === "under_review" ||
            value === "waitlist" ||
            value === "partial" ||
            value === "unpaid" ||
            value === "unconfirmed"
          ? "bg-amber-50 text-amber-700 border-amber-200"
          : "bg-slate-50 text-slate-700 border-slate-200";
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-[10.5px] font-semibold leading-none ${color}`}
    >
      {statusLabel(value)}
    </span>
  );
}

export type TableColumn<T> = {
  key: string;
  header: string;
  className?: string;
  sticky?: "left" | "right";
  render: (item: T) => ReactNode;
};

export function CompactTable<T>({
  columns,
  data,
  emptyText,
  rowKey,
}: {
  columns: TableColumn<T>[];
  data: T[];
  emptyText: string;
  rowKey: (item: T) => string | number;
}) {
  return (
    <div className="w-full min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="max-w-full overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-[12.5px]">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.02em] text-[#64748b]">
            <tr>
              {columns.map((column) => {
                const sticky =
                  column.sticky ??
                  (["action", "actions"].includes(column.key)
                    ? "right"
                    : undefined);
                const alignClass = ["action", "actions"].includes(column.key)
                  ? "text-center"
                  : "";
                const stickyClass =
                  sticky === "right"
                    ? "sticky right-0 z-20 border-l border-slate-200 bg-slate-50 shadow-[-8px_0_14px_rgba(15,23,42,0.05)]"
                    : sticky === "left"
                      ? "sticky left-0 z-20 border-r border-slate-200 bg-slate-50"
                      : "";
                return (
                  <th
                    key={column.key}
                    className={`h-9 border-b border-slate-200 px-2.5 font-semibold ${alignClass} ${stickyClass} ${column.className ?? ""}`}
                  >
                    {column.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr
                key={rowKey(item)}
                className="group border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70"
              >
                {columns.map((column) => {
                  const sticky =
                    column.sticky ??
                    (["action", "actions"].includes(column.key)
                      ? "right"
                      : undefined);
                  const alignClass = ["action", "actions"].includes(column.key)
                    ? "text-center"
                    : "";
                  const stickyClass =
                    sticky === "right"
                      ? "sticky right-0 z-10 border-l border-slate-100 bg-white shadow-[-8px_0_14px_rgba(15,23,42,0.04)] group-hover:bg-slate-50"
                      : sticky === "left"
                        ? "sticky left-0 z-10 border-r border-slate-100 bg-white group-hover:bg-slate-50"
                        : "";
                  return (
                    <td
                      key={column.key}
                      className={`h-12 px-2.5 py-2 align-middle text-[#334155] ${alignClass} ${stickyClass} ${column.className ?? ""}`}
                    >
                      {column.render(item)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length === 0 ? (
        <div className="p-3">
          <EmptyState text={emptyText} />
        </div>
      ) : null}
    </div>
  );
}

export function DrawerForm({
  open,
  title,
  description,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-y-0 left-0 right-0 z-50 grid place-items-center p-3 lg:left-[var(--madani-sidebar-offset,0px)]">
      <button
        type="button"
        className="absolute inset-0 bg-[#071744]/58 backdrop-blur-[1px]"
        aria-label="Tutup popup"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        className="relative z-10 flex max-h-[90vh] w-full max-w-[540px] flex-col overflow-hidden rounded-lg bg-white shadow-[0_18px_54px_rgba(10,31,92,0.20)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="text-base font-bold text-[#0a1f5c]">{title}</h2>
            {description ? (
              <p className="mt-1 text-xs leading-4 text-[#64748b]">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 text-[#64748b] hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </section>
    </div>
  );
}

export function FileField({
  label,
  files,
  onChange,
  accept,
  multiple,
}: {
  label: string;
  files: File[];
  onChange: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
}) {
  const text =
    files.length === 0
      ? "Belum ada file"
      : files.length === 1
        ? files[0].name
        : `${files.length} file dipilih`;

  return (
    <label className="grid gap-1.5 text-xs font-semibold text-[#0a1f5c]">
      {label}
      <span className="flex min-h-9 cursor-pointer items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left text-xs font-normal text-[#64748b] transition hover:border-[#0a1f5c]/30">
        <span className="inline-flex min-h-7 items-center gap-1.5 rounded-lg bg-[#0a1f5c] px-2.5 py-1 text-xs font-semibold text-white">
          <Upload className="h-3.5 w-3.5" />
          Pilih file
        </span>
        <span className="min-w-0 flex-1 truncate">{text}</span>
      </span>
      <input
        className="sr-only"
        type="file"
        accept={accept}
        multiple={multiple}
        suppressHydrationWarning
        onChange={(event) => onChange(Array.from(event.target.files ?? []))}
      />
    </label>
  );
}

export function TextInput({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  max?: string;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold text-[#0a1f5c]">
      {label}
      <input
        className="madani-input"
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        max={max}
        suppressHydrationWarning
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  required,
  rows = 4,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold text-[#0a1f5c]">
      {label}
      <textarea
        className="madani-input min-h-24"
        rows={rows}
        value={value}
        required={required}
        placeholder={placeholder}
        suppressHydrationWarning
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  children,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold text-[#0a1f5c]">
      {label}
      <select
        className="madani-input"
        value={value}
        required={required}
        suppressHydrationWarning
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  );
}

export function SubmitButton({
  children,
  pending,
}: {
  children: ReactNode;
  pending?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="madani-button bg-[#0a1f5c] text-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Save className="h-3.5 w-3.5" />
      {pending ? "Menyimpan..." : children}
    </button>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="relative w-full lg:max-w-[300px]">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]" />
      <input
        className="madani-input pl-10"
        style={{ paddingLeft: 38 }}
        value={value}
        placeholder={placeholder}
        suppressHydrationWarning
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function ActionGroup({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-w-max items-center justify-center gap-1.5">
      {children}
    </div>
  );
}

export function ActionButton({
  children,
  icon,
  tone = "plain",
  onClick,
  disabled,
}: {
  children: ReactNode;
  icon?: ReactNode;
  tone?: "plain" | "primary" | "danger";
  onClick?: () => void;
  disabled?: boolean;
}) {
  const toneClass =
    tone === "primary"
      ? "border-[#0a1f5c] bg-[#0a1f5c] text-white"
      : tone === "danger"
        ? "border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300"
        : "border-slate-200 bg-white text-[#0a1f5c] hover:border-[#0a1f5c]/30";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-7 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-2 text-[10.5px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-55 ${toneClass}`}
    >
      {icon}
      {children}
    </button>
  );
}
