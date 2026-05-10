"use client";

/* eslint-disable @next/next/no-img-element */

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BadgeCheck,
  Banknote,
  Bell,
  CalendarDays,
  CalendarOff,
  ChevronRight,
  Check,
  ClipboardCheck,
  Copy,
  FileSignature,
  Megaphone,
  Moon,
  NotebookPen,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings,
  Sparkles,
  Star,
  Trophy,
  Upload,
  Trash2,
  UserCheck,
  UserRoundCog,
  UserX,
  Users,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";
import { CompactStatCard } from "@/components/finance/compact-stat-card";
import { StudentPhotoFrame } from "@/components/student-photo-frame";
import { RolesSettingsPage } from "@/components/phase2-pages";
import { apiFetch, ApiResponse } from "@/lib/api";
import { formatRupiah } from "@/lib/format-currency";
import { usePermissions } from "@/lib/use-permissions";

type Role = string | { name: string };

type User = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  isActive?: boolean;
  roles?: Role[];
};

type AcademicYear = {
  id: number;
  name: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
};

type SchoolClass = {
  id: number;
  name: string;
  level: string;
  capacity?: number;
  studentsCount?: number;
  academicYear?: AcademicYear | null;
  teacher?: User | null;
};

type Student = {
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
  status?: string;
  parents?: User[];
  classes?: SchoolClass[];
};

type Attendance = {
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

type AttendanceStatus = "hadir" | "izin" | "sakit" | "alfa";

type Journal = {
  id: number;
  date: string;
  content: string;
  mood?: string | null;
  isPublished?: boolean;
  student?: Student | null;
  class?: SchoolClass | null;
  teacher?: User | null;
};

type MontessoriArea = {
  id: number;
  name: string;
  description?: string | null;
  sortOrder?: number;
  milestones?: MontessoriMilestone[];
  milestoneCount?: number;
  masteredCount?: number;
};

type MontessoriMilestone = {
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

type MilestoneStatus =
  | "not_started"
  | "introduced"
  | "in_progress"
  | "mastered";

type Report = {
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

type Announcement = {
  id: number;
  title: string;
  content?: string | null;
  target: string;
  targetClassIds?: number[] | null;
  targetUserIds?: number[] | null;
  isUrgent?: boolean;
  publishedAt?: string | null;
};

type Agenda = {
  id: number;
  title: string;
  description?: string | null;
  startDate: string;
  endDate?: string | null;
  location?: string | null;
  type: string;
  affectsAttendance?: boolean;
};

type Registration = {
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

type RegistrationStatus =
  | "pending"
  | "under_review"
  | "accepted"
  | "rejected"
  | "waitlist";

type EnrollmentCategory =
  | "new_student"
  | "re_registration"
  | "graduated"
  | "prep_class"
  | "not_continuing"
  | "unconfirmed";

type EnrollmentPaymentStatus =
  | "unpaid"
  | "partial"
  | "paid"
  | "not_applicable";

type EnrollmentConfirmationStatus =
  | "pending"
  | "confirmed"
  | "graduated"
  | "continuing"
  | "not_continuing"
  | "unconfirmed";

type EnrollmentUpdate = {
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

type EnrollmentSummary = {
  totalCount: number;
  financialCount: number;
  target: number;
  paid: number;
  outstanding: number;
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
};

type SettingRow = {
  id?: number;
  key: string;
  value: unknown;
  type?: string;
};

type DashboardData = {
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

const levelOptions = ["KB", "TK A", "TK B", "TK C"];
const attendanceOptions: AttendanceStatus[] = [
  "hadir",
  "izin",
  "sakit",
  "alfa",
];
const emptyList: unknown[] = [];
const milestoneOptions: MilestoneStatus[] = [
  "not_started",
  "introduced",
  "in_progress",
  "mastered",
];
const registrationStatuses: RegistrationStatus[] = [
  "pending",
  "under_review",
  "accepted",
  "waitlist",
  "rejected",
];
const enrollmentCategories: Array<{
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
const enrollmentPaymentStatuses: EnrollmentPaymentStatus[] = [
  "unpaid",
  "partial",
  "paid",
  "not_applicable",
];
const enrollmentConfirmationStatuses: EnrollmentConfirmationStatus[] = [
  "pending",
  "confirmed",
  "graduated",
  "continuing",
  "not_continuing",
  "unconfirmed",
];
const settingsTabKeys = ["years", "documents", "signature", "site"] as const;
type SettingsTabKey = (typeof settingsTabKeys)[number];

function todayInput() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function currentMonth() {
  return new Date().getMonth() + 1;
}

function currentYear() {
  return new Date().getFullYear();
}

function listFrom<T>(response?: ApiResponse<T[]>): T[] {
  return Array.isArray(response?.data) ? response.data : (emptyList as T[]);
}

function buildQuery(
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

function formatDate(value?: string | null) {
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

function formatMoney(value?: number | null) {
  return `Rp ${Number(value ?? 0).toLocaleString("id-ID")}`;
}

function compactMoney(value?: number | null) {
  return formatRupiah(Number(value ?? 0), true);
}

function roleNames(user?: User | null) {
  return (user?.roles ?? [])
    .map((role) => (typeof role === "string" ? role : role.name))
    .filter(Boolean);
}

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

function statusLabel(value?: string | null) {
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
  };
  return labels[value ?? ""] ?? value ?? "-";
}

function normalizeLevel(value?: string | null) {
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

function classLabel(item?: SchoolClass | null) {
  if (!item) return "-";
  const level = normalizeLevel(item.level);
  return item.name === level || !item.level
    ? item.name
    : `${item.name} / ${level}`;
}

function studentClass(student: Student) {
  return student.classes?.[0]?.name ?? "Belum masuk kelas";
}

function firstParent(student: Student) {
  return student.parents?.[0];
}

function studentLevel(student: Student) {
  return normalizeLevel(student.classes?.[0]?.level);
}

function matchesLevel(value?: string | null, filter?: string) {
  if (!filter) return true;
  return normalizeLevel(value) === filter;
}

function levelTabs<T>(
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

function settingValue(settings: SettingRow[], key: string, fallback = "") {
  const row = settings.find((item) => item.key === key);
  if (!row) return fallback;
  const value = row.value;
  if (value && typeof value === "object" && "value" in value) {
    const inner = (value as { value?: unknown }).value;
    return Array.isArray(inner) ? inner.join("\n") : String(inner ?? fallback);
  }
  return Array.isArray(value) ? value.join("\n") : String(value ?? fallback);
}

function useList<T>(key: unknown[], endpoint: string, enabled = true) {
  return useQuery({
    queryKey: key,
    queryFn: () => apiFetch<T[]>(endpoint),
    enabled,
    retry: false,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

function useSafeList<T>(key: unknown[], endpoint: string, enabled = true) {
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

function PageHeader({
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

function Breadcrumbs({
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

function Panel({
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

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs font-medium text-[#64748b]">
      {text}
    </div>
  );
}

function CategoryTabs({
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

function StatusBadge({ value }: { value?: string | null }) {
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

type TableColumn<T> = {
  key: string;
  header: string;
  className?: string;
  sticky?: "left" | "right";
  render: (item: T) => ReactNode;
};

function CompactTable<T>({
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

function DrawerForm({
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

function FileField({
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

function TextInput({
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

function TextArea({
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

function SelectField({
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

function SubmitButton({
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

function SearchField({
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

function ActionGroup({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-w-max items-center justify-center gap-1.5">
      {children}
    </div>
  );
}

function ActionButton({
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

export function DashboardHome() {
  const [mounted, setMounted] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch<DashboardData>("/dashboard"),
  });
  useEffect(() => setMounted(true), []);
  const stats = data?.data;
  const totalStudents = stats?.totalActiveStudents ?? 0;

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
              label: "Tulis jurnal",
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
        <section className="grid items-start gap-4 xl:grid-cols-2">
          <DashboardAttendanceByClass
            rows={stats?.attendanceByClass ?? []}
            isLoading={isLoading}
          />
          <DashboardAgendaList
            agendas={stats?.upcomingAgendas ?? []}
            announcements={stats?.recentAnnouncements ?? []}
            isLoading={isLoading}
          />
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
              <ClassCapacityChart
                mounted={mounted}
                rows={stats?.analytics?.studentsPerClass ?? []}
              />
            </div>
          </div>
        </section>

        <section className="mt-6">
          <DashboardSectionHeader title="Keuangan & Operasional" />
          <div className="grid items-start gap-4 xl:grid-cols-[5fr_4fr_3fr]">
            <FinancialCategoryBreakdown finance={stats?.financeSummary} />
            <HafalanDonutChart
              mounted={mounted}
              rows={stats?.analytics?.hafalanProgress ?? []}
            />
            <ActionItemList actionItems={stats?.actionItems} />
          </div>
        </section>
      </div>
    </div>
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
      subtitle="Status absensi murid aktif per kelas — diperbarui otomatis"
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

function DashboardAgendaList({
  agendas,
  announcements,
  isLoading,
}: {
  agendas: Agenda[];
  announcements: Announcement[];
  isLoading: boolean;
}) {
  const items = [
    ...agendas.map((agenda) => ({
      id: `agenda-${agenda.id}`,
      title: agenda.title,
      date: agenda.startDate,
      meta: agenda.location || "Agenda sekolah",
      type: agenda.type,
      isAnnouncement: false,
    })),
    ...announcements.map((announcement) => ({
      id: `announcement-${announcement.id}`,
      title: announcement.title,
      date: announcement.publishedAt ?? null,
      meta: "Pengumuman",
      type: "pengumuman",
      isAnnouncement: true,
    })),
  ].slice(0, 6);

  return (
    <DashboardCard
      title="Jadwal Terdekat"
      subtitle="Agenda sekolah dan pengumuman aktif dalam 14 hari ke depan"
    >
      {items.length > 0 ? (
        <div className="grid">
          {items.map((item) => {
            const meta = agendaTypeMeta(item.type);
            const Icon = meta.icon;
            const badge = item.isAnnouncement ? null : relativeDayBadge(item.date);

            return (
              <div
                key={item.id}
                className="flex items-start gap-3 border-b border-slate-200/70 py-2.5 last:border-0"
              >
                <span
                  className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${meta.className}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="min-w-0 truncate text-sm font-medium text-slate-900">
                      {item.title}
                    </p>
                    {badge ? (
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                        {badge}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-[#64748b]">
                    {item.date ? formatDate(item.date) : "Aktif"} · {item.meta}
                  </p>
                </div>
              </div>
            );
          })}
          {(agendas.length + announcements.length) > 6 ? (
            <Link
              href="/agendas"
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
              ? "Memuat jadwal terdekat."
              : "Tidak ada agenda dalam 14 hari ke depan."
          }
        />
      )}
    </DashboardCard>
  );
}

function WeeklyAttendanceTrend({
  mounted,
  rows,
  totalStudents,
}: {
  mounted: boolean;
  rows: NonNullable<DashboardData["analytics"]>["attendanceTrend"];
  totalStudents: number;
}) {
  const chartRows = rows.map((row, index) => {
    const axisLabel =
      row.label?.replace("\n", "|") ??
      `W${row.weekNumber ?? row.week}|${formatShortDayMonth(row.startDate)}`;

    return {
      ...row,
      axisLabel,
      latestHadirLabel: index === rows.length - 1 ? row.hadir : undefined,
    };
  });
  const average =
    chartRows.length > 0
      ? Math.round(chartRows.reduce((sum, row) => sum + row.hadir, 0) / chartRows.length)
      : 0;
  const yMax = Math.max(totalStudents + 5, 5);

  return (
    <DashboardCard
      title="Tren Kehadiran"
      subtitle="Jumlah murid hadir vs tidak hadir (izin+sakit+alfa) per minggu — 8 minggu terakhir"
    >
      {!mounted ? (
        <EmptyState text="Memuat grafik tren kehadiran." />
      ) : chartRows.length > 0 ? (
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <ComposedChart
              data={chartRows}
              margin={{ top: 12, right: 20, bottom: 0, left: -18 }}
            >
              <defs>
                <linearGradient id="hadirGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#bbf7d0" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#d1fae5" stopOpacity={0.25} />
                </linearGradient>
                <linearGradient id="absenGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#fecdd3" stopOpacity={0.85} />
                  <stop offset="100%" stopColor="#ffe4e6" stopOpacity={0.25} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="axisLabel"
                height={34}
                interval={0}
                tick={<WeeklyAxisTick />}
                tickLine={false}
                axisLine={{ stroke: "#e2e8f0" }}
              />
              <YAxis
                width={34}
                domain={[0, yMax]}
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<WeeklyAttendanceTooltip />} />
              {average > 0 ? (
                <ReferenceLine
                  y={average}
                  stroke="#94a3b8"
                  strokeDasharray="3 3"
                  label={{
                    value: "Rata-rata",
                    position: "insideRight",
                    fill: "#64748b",
                    fontSize: 11,
                  }}
                />
              ) : null}
              <Legend
                verticalAlign="bottom"
                height={26}
                iconType="circle"
                wrapperStyle={{ fontSize: 12, color: "#475569" }}
              />
              <Area
                type="monotone"
                dataKey="hadir"
                name="Hadir"
                fill="url(#hadirGradient)"
                stroke={academicColors.hadir}
                strokeWidth={2}
                dot={{ r: 2, strokeWidth: 1 }}
                activeDot={{ r: 4 }}
              >
                <LabelList
                  dataKey="latestHadirLabel"
                  position="top"
                  fill="#059669"
                  fontSize={11}
                  fontWeight={600}
                />
              </Area>
              <Area
                type="monotone"
                dataKey="tidakHadir"
                name="Tidak Hadir"
                fill="url(#absenGradient)"
                stroke="#f43f5e"
                strokeWidth={2}
                dot={{ r: 2, strokeWidth: 1 }}
                activeDot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState text="Belum ada data tren absensi mingguan." />
      )}
    </DashboardCard>
  );
}

function MontessoriProgressChart({
  mounted,
  rows,
}: {
  mounted: boolean;
  rows: NonNullable<DashboardData["analytics"]>["milestoneProgress"];
}) {
  const chartRows = rows.map((row) => {
    const area = row.area ?? row.name ?? "-";
    const pct = row.total > 0 ? Number(row.pct ?? (row.mastered / row.total) * 100) : 0;

    return {
      ...row,
      area,
      shortArea: area === "Mathematics" ? "Math" : area,
      masteredPct: pct,
      remainingPct: Math.max(100 - pct, 0),
      pctLabel: `${Math.round(pct)}%`,
    };
  });

  return (
    <DashboardCard
      title="Pencapaian Montessori"
      subtitle="Persentase milestone mastered dari total milestone per area — semua murid aktif"
    >
      {!mounted ? (
        <EmptyState text="Memuat grafik Montessori." />
      ) : chartRows.length > 0 ? (
        <>
          <div className="grid gap-2.5 sm:hidden">
            {chartRows.map((row) => (
              <ProgressListRow
                key={row.area}
                label={row.area}
                value={row.pctLabel}
                percent={Math.round(row.masteredPct)}
                color={montessoriColors[row.area] ?? academicColors.netral}
              />
            ))}
          </div>
          <div className="hidden h-[180px] w-full sm:block">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart
              data={chartRows}
              layout="vertical"
              barCategoryGap={8}
              margin={{ top: 2, right: 36, bottom: 0, left: 4 }}
            >
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis
                type="category"
                dataKey="shortArea"
                width={88}
                tick={{ fontSize: 11, fill: "#475569" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<MontessoriTooltip />} />
              <Bar dataKey="masteredPct" stackId="progress" radius={[4, 0, 0, 4]}>
                {chartRows.map((row) => (
                  <Cell
                    key={row.area}
                    fill={montessoriColors[row.area] ?? academicColors.netral}
                  />
                ))}
              </Bar>
              <Bar
                dataKey="remainingPct"
                stackId="progress"
                fill="#f1f5f9"
                radius={[0, 4, 4, 0]}
              >
                <LabelList content={(props) => renderBarEndLabel(props, chartRows[Number(props.index)]?.pctLabel ?? "0%")} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          </div>
        </>
      ) : (
        <EmptyState text="Belum ada data milestone Montessori." />
      )}
    </DashboardCard>
  );
}

function ClassCapacityChart({
  mounted,
  rows,
}: {
  mounted: boolean;
  rows: NonNullable<DashboardData["analytics"]>["studentsPerClass"];
}) {
  const chartRows = rows.map((row) => {
    const capacity = Math.max(row.capacity ?? row.studentsCount, row.studentsCount, 1);
    const percent = Math.round((row.studentsCount / capacity) * 100);

    return {
      ...row,
      capacity,
      remainingCapacity: Math.max(capacity - row.studentsCount, 0),
      label: `${row.studentsCount}/${capacity}`,
      percent,
    };
  });

  return (
    <DashboardCard
      title="Kapasitas Kelas"
      subtitle="Jumlah murid terdaftar vs kapasitas maksimal per kelas"
    >
      {!mounted ? (
        <EmptyState text="Memuat grafik kapasitas kelas." />
      ) : chartRows.length > 0 ? (
        <>
          <div className="grid gap-2.5 sm:hidden">
            {chartRows.map((row) => (
              <ProgressListRow
                key={row.name}
                label={row.name}
                value={row.label}
                percent={row.percent}
                color="#3b82f6"
                showAlert={row.percent > 85}
              />
            ))}
          </div>
          <div className="hidden h-[150px] w-full sm:block">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart
              data={chartRows}
              layout="vertical"
              barCategoryGap={8}
              margin={{ top: 0, right: 38, bottom: 0, left: 6 }}
            >
              <XAxis type="number" hide domain={[0, "dataMax"]} />
              <YAxis
                type="category"
                dataKey="name"
                width={98}
                tick={(props) => <ClassCapacityTick {...props} rows={chartRows} />}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<ClassCapacityTooltip />} />
              <Bar
                dataKey="studentsCount"
                stackId="capacity"
                fill="#3b82f6"
                radius={[4, 0, 0, 4]}
              />
              <Bar
                dataKey="remainingCapacity"
                stackId="capacity"
                fill="#f1f5f9"
                radius={[0, 4, 4, 0]}
              >
                <LabelList content={(props) => renderBarEndLabel(props, chartRows[Number(props.index)]?.label ?? "0/0")} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          </div>
        </>
      ) : (
        <EmptyState text="Belum ada data kapasitas kelas." />
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
      subtitle="Perbandingan uang masuk per kategori vs rencana pengeluaran — Mei 2026"
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
              {unpaidCount} tagihan belum dibayar · {formatMoney(finance?.outstanding)}
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

function HafalanDonutChart({
  mounted,
  rows,
}: {
  mounted: boolean;
  rows: NonNullable<DashboardData["analytics"]>["hafalanProgress"];
}) {
  const order = ["mutqin", "lancar", "sedang_dihafal", "belum"];
  const labels: Record<string, string> = {
    mutqin: "Mutqin",
    lancar: "Lancar",
    sedang_dihafal: "Sedang",
    belum: "Belum",
  };
  const chartRows = order.map((status) => {
    const row = rows.find((item) => item.status === status);
    return {
      status,
      label: labels[status],
      total: row?.total ?? 0,
      pct: row?.pct ?? 0,
    };
  });
  const total = chartRows.reduce((sum, row) => sum + row.total, 0);
  const activeTotal = chartRows
    .filter((row) => row.status !== "belum")
    .reduce((sum, row) => sum + row.total, 0);
  const visibleSlices = chartRows.filter((row) => row.total > 0);

  return (
    <DashboardCard
      title="Progress Hafalan"
      subtitle="Distribusi status hafalan surah dari seluruh murid aktif"
    >
      {!mounted ? (
        <EmptyState text="Memuat grafik hafalan." />
      ) : total > 0 ? (
        <div className="grid gap-3">
          <div className="mx-auto h-[140px] w-[140px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={visibleSlices}
                  dataKey="total"
                  nameKey="label"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={1}
                  startAngle={90}
                  endAngle={-270}
                  isAnimationActive={false}
                  stroke="none"
                >
                  {visibleSlices.map((row) => (
                    <Cell key={row.status} fill={hafalanColors[row.status]} />
                  ))}
                </Pie>
                <text
                  x="50%"
                  y="48%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-slate-900 text-sm font-semibold"
                >
                  {activeTotal}
                </text>
                <text
                  x="50%"
                  y="62%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-[#64748b] text-[11px]"
                >
                  surah aktif
                </text>
                <Tooltip content={<HafalanTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-[#64748b]">
            {chartRows.map((row) => (
              <span key={row.status} className="inline-flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-[2px]"
                  style={{ backgroundColor: hafalanColors[row.status] }}
                />
                {row.label} ({row.pct}%)
              </span>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState text="Belum ada data progress hafalan." />
      )}
    </DashboardCard>
  );
}

function ActionItemList({ actionItems }: { actionItems?: ActionItems }) {
  const items = [
    {
      label: "Izin absensi menunggu",
      count: actionItems?.absencePending ?? 0,
      href: "/absence-requests",
      color: "bg-rose-500",
      urgency: 1,
    },
    {
      label: "Tagihan SPP belum dibayar",
      count: actionItems?.feesUnpaid ?? 0,
      href: "/fees",
      color: "bg-amber-400",
      urgency: 2,
    },
    {
      label: "PPDB menunggu review",
      count: actionItems?.ppdbPending ?? 0,
      href: "/registrations",
      color: "bg-orange-500",
      urgency: 3,
    },
    {
      label: "Raport belum dipublish",
      count: actionItems?.reportsUnpublished ?? 0,
      href: "/reports",
      color: "bg-amber-400",
      urgency: 4,
    },
    {
      label: "Jurnal belum diisi hari ini",
      count: actionItems?.journalsMissingToday ?? 0,
      href: "/journals",
      color: "bg-blue-500",
      urgency: 5,
    },
  ].sort((a, b) => a.urgency - b.urgency);
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

function ProgressListRow({
  label,
  value,
  percent,
  color,
  showAlert = false,
}: {
  label: string;
  value: string;
  percent: number;
  color: string;
  showAlert?: boolean;
}) {
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="inline-flex min-w-0 items-center gap-1.5 font-medium text-slate-800">
          {showAlert ? <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> : null}
          <span className="truncate">{label}</span>
        </span>
        <span className="shrink-0 font-semibold text-slate-700">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(Math.max(percent, 0), 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function ChartTooltipFrame({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-slate-900">{title}</p>
      <div className="grid gap-0.5 text-[#64748b]">{children}</div>
    </div>
  );
}

function WeeklyAttendanceTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as {
    weekNumber?: number;
    range?: string;
    hadir?: number;
    tidakHadir?: number;
    ratio?: number;
  };

  return (
    <ChartTooltipFrame
      title={`Minggu ${row.weekNumber ?? "-"} (${row.range ?? "-"})`}
    >
      <span>Hadir: {row.hadir ?? 0} murid</span>
      <span>Tidak hadir: {row.tidakHadir ?? 0} murid</span>
      <span>Rasio: {row.ratio ?? 0}%</span>
    </ChartTooltipFrame>
  );
}

function MontessoriTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as {
    area?: string;
    mastered?: number;
    total?: number;
    masteredPct?: number;
  };

  return (
    <ChartTooltipFrame title={row.area ?? "Area Montessori"}>
      <span>
        {row.mastered ?? 0} dari {row.total ?? 0} milestone dikuasai (
        {Number(row.masteredPct ?? 0).toFixed(1)}%)
      </span>
    </ChartTooltipFrame>
  );
}

function ClassCapacityTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as {
    name?: string;
    studentsCount?: number;
    capacity?: number;
    percent?: number;
  };

  return (
    <ChartTooltipFrame title={row.name ?? "Kelas"}>
      <span>
        {row.studentsCount ?? 0} murid dari kapasitas {row.capacity ?? 0} (
        {row.percent ?? 0}%)
      </span>
    </ChartTooltipFrame>
  );
}

function HafalanTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as {
    label?: string;
    total?: number;
    pct?: number;
  };

  return (
    <ChartTooltipFrame title={row.label ?? "Status hafalan"}>
      <span>
        {row.total ?? 0} pencatatan ({row.pct ?? 0}%)
      </span>
    </ChartTooltipFrame>
  );
}

function WeeklyAxisTick({
  x,
  y,
  payload,
}: {
  x?: number;
  y?: number;
  payload?: { value?: string };
}) {
  const [week, date] = String(payload?.value ?? "").split("|");

  return (
    <g transform={`translate(${x ?? 0},${y ?? 0})`}>
      <text textAnchor="middle" fill="#64748b" fontSize={10}>
        <tspan x="0" dy="0">
          {week}
        </tspan>
        <tspan x="0" dy="12">
          {date}
        </tspan>
      </text>
    </g>
  );
}

function ClassCapacityTick({
  x,
  y,
  payload,
  rows,
}: {
  x?: number | string;
  y?: number | string;
  payload?: { value?: string; index?: number };
  rows: Array<{ name: string; percent: number }>;
}) {
  const row = rows[Number(payload?.index ?? -1)];
  const isFull = (row?.percent ?? 0) > 85;

  return (
    <g transform={`translate(${chartNumber(x)},${chartNumber(y)})`}>
      {isFull ? <circle cx="-7" cy="0" r="3" fill="#ef4444" /> : null}
      <text
        x="0"
        y="0"
        dy="0.32em"
        textAnchor="end"
        fill="#475569"
        fontSize={11}
      >
        {payload?.value}
      </text>
    </g>
  );
}

function renderBarEndLabel(
  props: {
    x?: number | string;
    y?: number | string;
    width?: number | string;
    height?: number | string;
  },
  value: string,
) {
  const x = chartNumber(props.x) + chartNumber(props.width) - 4;
  const y = chartNumber(props.y) + chartNumber(props.height) / 2 + 4;

  return (
    <text
      x={x}
      y={y}
      fill="#334155"
      fontSize={11}
      fontWeight={600}
      textAnchor="end"
    >
      {value}
    </text>
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LegacyDashboardHome() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch<DashboardData>("/dashboard"),
  });
  const stats = data?.data;

  const daily = [
    { label: "Murid aktif", value: stats?.totalActiveStudents ?? 0 },
    { label: "Hadir hari ini", value: stats?.presentToday ?? 0 },
    { label: "Tidak hadir", value: stats?.absentToday ?? 0 },
    { label: "Jurnal hari ini", value: stats?.journalsToday ?? 0 },
    { label: "PPDB pending", value: stats?.pendingRegistrations ?? 0 },
  ];

  return (
    <div className="grid gap-4">
      <section className="grid gap-2 md:grid-cols-4">
        {[
          {
            href: "/attendance",
            label: "Isi absensi",
            icon: <ClipboardCheck className="h-4 w-4" />,
          },
          {
            href: "/journals",
            label: "Tulis jurnal",
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
            className="group flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 transition hover:border-[#0a1f5c]/30 hover:bg-slate-50"
          >
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-[#0a1f5c] group-hover:bg-[#0a1f5c] group-hover:text-white">
              {item.icon}
            </span>
            <span className="text-sm font-semibold text-[#0a1f5c]">
              {item.label}
            </span>
          </Link>
        ))}
      </section>

      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {daily.map((item) => (
          <article
            key={item.label}
            className="rounded-2xl border border-slate-200 bg-white p-4"
          >
            <p className="text-xs font-medium text-[#64748b]">{item.label}</p>
            <p className="font-display mt-1 text-3xl font-extrabold text-[#0a1f5c]">
              {isLoading ? "-" : item.value}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel
          title="Kehadiran minggu ini"
          description="Rasio hadir dibanding izin, sakit, dan alfa."
        >
          <div className="grid gap-2">
            {(stats?.attendanceThisWeek ?? []).map((day) => {
              const total = day.hadir + day.tidakHadir;
              const percent =
                total > 0 ? Math.round((day.hadir / total) * 100) : 0;
              const absentPercent = total > 0 ? 100 - percent : 0;
              return (
                <div
                  key={day.day}
                  className="rounded-xl border border-slate-200 bg-white p-3"
                >
                  <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                    <span className="font-semibold text-[#0a1f5c]">
                      {day.day}
                    </span>
                    <span className="text-[#64748b]">
                      {day.hadir} hadir · {day.tidakHadir} tidak hadir
                    </span>
                  </div>
                  <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
                    {total > 0 ? (
                      <>
                        <div
                          className="bg-[#157f52]"
                          style={{ width: `${percent}%` }}
                        />
                        <div
                          className="bg-[#b8323c]"
                          style={{ width: `${absentPercent}%` }}
                        />
                      </>
                    ) : null}
                  </div>
                  <div className="mt-2 flex justify-between text-[11px] font-medium text-[#64748b]">
                    <span>{day.hadir} hadir</span>
                    <span>{day.tidakHadir} tidak hadir</span>
                  </div>
                </div>
              );
            })}
            {!isLoading && (stats?.attendanceThisWeek ?? []).length === 0 ? (
              <EmptyState text="Belum ada catatan absensi minggu ini." />
            ) : null}
          </div>
        </Panel>

        <Panel
          title="Jadwal terdekat"
          description="Agenda dan pengumuman yang sudah masuk."
        >
          <div className="grid gap-2">
            {(stats?.upcomingAgendas ?? []).slice(0, 4).map((item) => (
              <article
                key={`agenda-${item.id}`}
                className="rounded-xl border border-slate-200 p-3"
              >
                <p className="font-semibold text-[#0a1f5c]">{item.title}</p>
                <p className="mt-1 text-xs font-medium text-[#64748b]">
                  {formatDate(item.startDate)}
                  {item.location ? ` · ${item.location}` : ""}
                </p>
              </article>
            ))}
            {(stats?.recentAnnouncements ?? []).slice(0, 3).map((item) => (
              <article
                key={`announcement-${item.id}`}
                className="rounded-xl border border-slate-200 bg-white p-3"
              >
                <p className="font-semibold text-[#0a1f5c]">{item.title}</p>
                <p className="mt-1 text-xs font-medium text-[#64748b]">
                  Pengumuman
                  {item.publishedAt ? ` · ${formatDate(item.publishedAt)}` : ""}
                </p>
              </article>
            ))}
            {!isLoading &&
            (stats?.upcomingAgendas ?? []).length === 0 &&
            (stats?.recentAnnouncements ?? []).length === 0 ? (
              <EmptyState text="Belum ada agenda atau pengumuman." />
            ) : null}
          </div>
        </Panel>
      </section>
    </div>
  );
}

export function StudentsPage() {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<number | null>(null);
  const [form, setForm] = useState({
    nis: "",
    fullName: "",
    nickname: "",
    birthDate: "",
    birthPlace: "",
    gender: "L",
    address: "",
    joinDate: todayInput(),
    status: "active",
    classId: "",
    parentName: "",
    parentEmail: "",
    parentPhone: "",
    parentRelation: "wali",
  });

  const studentsQuery = useList<Student>(
    ["students", search, status],
    buildQuery("/students", { search, status, perPage: 100 }),
  );
  const classesQuery = useList<SchoolClass>(
    ["classes", "options"],
    "/classes?perPage=100",
  );
  const students = listFrom(studentsQuery.data);
  const classes = listFrom(classesQuery.data);
  const filteredStudents = students.filter((student) =>
    matchesLevel(studentLevel(student), levelFilter),
  );

  function resetStudentForm() {
    setEditingStudentId(null);
    setForm({
      nis: "",
      fullName: "",
      nickname: "",
      birthDate: "",
      birthPlace: "",
      gender: "L",
      address: "",
      joinDate: todayInput(),
      status: "active",
      classId: "",
      parentName: "",
      parentEmail: "",
      parentPhone: "",
      parentRelation: "wali",
    });
  }

  function openCreateStudent() {
    resetStudentForm();
    setFormOpen(true);
  }

  function openEditStudent(student: Student) {
    const parent = firstParent(student);
    setEditingStudentId(student.id);
    setForm({
      nis: student.nis ?? "",
      fullName: student.fullName,
      nickname: student.nickname ?? "",
      birthDate: student.birthDate?.slice(0, 10) ?? "",
      birthPlace: student.birthPlace ?? "",
      gender: student.gender ?? "L",
      address: student.address ?? "",
      joinDate: student.joinDate?.slice(0, 10) ?? todayInput(),
      status: student.status ?? "active",
      classId: student.classes?.[0]?.id ? String(student.classes[0].id) : "",
      parentName: parent?.name ?? "",
      parentEmail: parent?.email ?? "",
      parentPhone: parent?.phone ?? "",
      parentRelation: "wali",
    });
    setFormOpen(true);
  }

  const saveStudent = useMutation({
    mutationFn: () =>
      apiFetch<Student>(
        editingStudentId ? `/students/${editingStudentId}` : "/students",
        {
          method: editingStudentId ? "PUT" : "POST",
          body: {
            ...form,
            classId: form.classId || undefined,
            parentRelation: form.parentRelation,
          },
        },
      ),
    onSuccess: () => {
      toast.success("Murid tersimpan");
      resetStudentForm();
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setFormOpen(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteStudent = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/students/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Murid dihapus");
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="grid gap-4">
      <PageHeader
        icon={<Users className="h-5 w-5" />}
        title="Murid"
        description="Tambah data anak, sambungkan orang tua, dan tempatkan ke kelas aktif."
      >
        <div className="flex w-full flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Cari nama atau NIS"
          />
          <div className="grid gap-2 sm:grid-cols-[150px_auto]">
            <select
              className="madani-input"
              value={status}
              suppressHydrationWarning
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">Semua status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
              <option value="alumni">Alumni</option>
            </select>
            {can("add_students") ? (
              <button
                type="button"
                onClick={openCreateStudent}
                className="madani-button bg-[#0a1f5c] text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah murid
              </button>
            ) : null}
          </div>
        </div>
      </PageHeader>

      <DrawerForm
        open={
          formOpen &&
          (editingStudentId ? can("edit_students") : can("add_students"))
        }
        title={editingStudentId ? "Edit murid" : "Tambah murid"}
        description="Data anak, orang tua, dan kelas aktif."
        onClose={() => {
          setFormOpen(false);
          resetStudentForm();
        }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            saveStudent.mutate();
          }}
          className="grid gap-4"
        >
          <section className="grid gap-3">
            <p className="text-xs font-bold uppercase text-[#64748b]">
              Data anak
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <TextInput
                label="Nama lengkap"
                value={form.fullName}
                required
                onChange={(value) => setForm({ ...form, fullName: value })}
              />
              <TextInput
                label="Nama panggilan"
                value={form.nickname}
                onChange={(value) => setForm({ ...form, nickname: value })}
              />
              <TextInput
                label="NIS"
                value={form.nis}
                onChange={(value) => setForm({ ...form, nis: value })}
              />
              <SelectField
                label="Jenis kelamin"
                value={form.gender}
                required
                onChange={(value) => setForm({ ...form, gender: value })}
              >
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </SelectField>
              <TextInput
                label="Tempat lahir"
                value={form.birthPlace}
                onChange={(value) => setForm({ ...form, birthPlace: value })}
              />
              <TextInput
                label="Tanggal lahir"
                type="date"
                value={form.birthDate}
                required
                onChange={(value) => setForm({ ...form, birthDate: value })}
              />
              <TextInput
                label="Tanggal masuk"
                type="date"
                value={form.joinDate}
                required
                onChange={(value) => setForm({ ...form, joinDate: value })}
              />
              <SelectField
                label="Status"
                value={form.status}
                required
                onChange={(value) => setForm({ ...form, status: value })}
              >
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
                <option value="alumni">Alumni</option>
              </SelectField>
              <SelectField
                label="Kelas"
                value={form.classId}
                onChange={(value) => setForm({ ...form, classId: value })}
              >
                <option value="">Belum ditempatkan</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {classLabel(item)}
                  </option>
                ))}
              </SelectField>
            </div>
            <div>
              <TextArea
                label="Alamat"
                value={form.address}
                rows={3}
                onChange={(value) => setForm({ ...form, address: value })}
              />
            </div>
          </section>

          <section className="grid gap-3 border-t border-slate-200 pt-4">
            <p className="text-xs font-bold uppercase text-[#64748b]">
              Orang tua
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <TextInput
                label="Nama"
                value={form.parentName}
                onChange={(value) => setForm({ ...form, parentName: value })}
              />
              <TextInput
                label="Email"
                type="email"
                value={form.parentEmail}
                onChange={(value) => setForm({ ...form, parentEmail: value })}
              />
              <TextInput
                label="No. HP"
                value={form.parentPhone}
                onChange={(value) => setForm({ ...form, parentPhone: value })}
              />
              <SelectField
                label="Relasi"
                value={form.parentRelation}
                onChange={(value) =>
                  setForm({ ...form, parentRelation: value })
                }
              >
                <option value="ayah">Ayah</option>
                <option value="ibu">Ibu</option>
                <option value="wali">Wali</option>
              </SelectField>
            </div>
          </section>
          <SubmitButton pending={saveStudent.isPending}>
            Simpan murid
          </SubmitButton>
        </form>
      </DrawerForm>

      <Panel
        title="Daftar murid"
        description={`${filteredStudents.length} murid tampil.`}
      >
        <CategoryTabs
          value={levelFilter}
          onChange={setLevelFilter}
          items={levelTabs(students, studentLevel)}
        />
        <CompactTable
          data={filteredStudents}
          rowKey={(student) => student.id}
          emptyText={
            studentsQuery.isLoading
              ? "Memuat murid."
              : "Belum ada murid sesuai filter."
          }
          columns={[
            {
              key: "name",
              header: "Murid",
              render: (student) => (
                <div>
                  <p className="font-semibold text-[#0a1f5c]">
                    {student.fullName}
                  </p>
                  <p className="text-xs text-[#64748b]">
                    {student.nickname ?? "-"} /{" "}
                    {student.nis ?? "NIS belum diisi"}
                  </p>
                </div>
              ),
            },
            {
              key: "class",
              header: "Kelas",
              render: (student) => studentClass(student),
            },
            {
              key: "birth",
              header: "Lahir",
              render: (student) => formatDate(student.birthDate),
            },
            {
              key: "parent",
              header: "Orang tua",
              render: (student) => firstParent(student)?.name ?? "-",
            },
            {
              key: "status",
              header: "Status",
              render: (student) => <StatusBadge value={student.status} />,
            },
            {
              key: "actions",
              header: "Aksi",
              className: "w-[150px]",
              render: (student) =>
                can("edit_students") ? (
                  <ActionGroup>
                    <ActionButton
                      icon={<Pencil className="h-3.5 w-3.5" />}
                      onClick={() => openEditStudent(student)}
                    >
                      Edit
                    </ActionButton>
                    <ActionButton
                      tone="danger"
                      icon={<Trash2 className="h-3.5 w-3.5" />}
                      onClick={() => {
                        if (window.confirm(`Hapus murid ${student.fullName}?`))
                          deleteStudent.mutate(student.id);
                      }}
                    >
                      Hapus
                    </ActionButton>
                  </ActionGroup>
                ) : (
                  <span className="text-xs font-semibold text-[#64748b]">
                    Lihat saja
                  </span>
                ),
            },
          ]}
        />
      </Panel>
    </div>
  );
}

export function ClassesPage() {
  const queryClient = useQueryClient();
  const classesQuery = useList<SchoolClass>(
    ["classes"],
    "/classes?perPage=100",
  );
  const yearsQuery = useList<AcademicYear>(
    ["academic-years"],
    "/academic-years",
  );
  const usersQuery = useSafeList<User>(
    ["users", "teacher-options"],
    "/users?perPage=100",
  );
  const classes = listFrom(classesQuery.data);
  const years = listFrom(yearsQuery.data);
  const teachers = listFrom(usersQuery.data).filter((user) =>
    roleNames(user).includes("guru"),
  );
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const filteredClasses = classes.filter((item) => {
    const keyword = search.trim().toLowerCase();
    if (!matchesLevel(item.level, levelFilter)) return false;
    if (!keyword) return true;
    return [
      item.name,
      item.level,
      item.academicYear?.name ?? "",
      item.teacher?.name ?? "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(keyword);
  });
  const [form, setForm] = useState({
    academicYearId: "",
    teacherId: "",
    name: "",
    level: "TK A",
    capacity: "20",
  });

  useEffect(() => {
    if (!form.academicYearId && years.length > 0) {
      setForm((current) => ({
        ...current,
        academicYearId: String(
          years.find((item) => item.isActive)?.id ?? years[0].id,
        ),
      }));
    }
  }, [form.academicYearId, years]);

  const create = useMutation({
    mutationFn: () =>
      apiFetch<SchoolClass>("/classes", {
        method: "POST",
        body: {
          academicYearId: form.academicYearId,
          teacherId: form.teacherId || undefined,
          name: form.name,
          level: form.level,
          capacity: Number(form.capacity),
        },
      }),
    onSuccess: () => {
      toast.success("Kelas tersimpan");
      setForm((current) => ({
        ...current,
        teacherId: "",
        name: "",
        level: "TK A",
        capacity: "20",
      }));
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        icon={<Users className="h-5 w-5" />}
        title="Kelas"
        description="Atur rombel, level, wali kelas, kapasitas, dan tahun ajaran."
      >
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Cari kelas, wali, tahun"
        />
      </PageHeader>

      <section className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <Panel
          title="Rombel baru"
          description="Pakai tahun ajaran aktif sebagai default."
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              create.mutate();
            }}
            className="grid gap-4"
          >
            <SelectField
              label="Tahun ajaran"
              value={form.academicYearId}
              required
              onChange={(value) => setForm({ ...form, academicYearId: value })}
            >
              <option value="">Pilih tahun ajaran</option>
              {years.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                  {year.isActive ? " · aktif" : ""}
                </option>
              ))}
            </SelectField>
            <TextInput
              label="Nama kelas"
              value={form.name}
              required
              onChange={(value) => setForm({ ...form, name: value })}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Level"
                value={form.level}
                required
                onChange={(value) => setForm({ ...form, level: value })}
              >
                {levelOptions.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </SelectField>
              <TextInput
                label="Kapasitas"
                type="number"
                value={form.capacity}
                required
                onChange={(value) => setForm({ ...form, capacity: value })}
              />
            </div>
            <SelectField
              label="Wali kelas"
              value={form.teacherId}
              onChange={(value) => setForm({ ...form, teacherId: value })}
            >
              <option value="">Belum ditentukan</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </SelectField>
            <SubmitButton pending={create.isPending}>Simpan kelas</SubmitButton>
          </form>
        </Panel>

        <Panel
          title="Rombel aktif"
          description={`${filteredClasses.length} kelas tampil.`}
        >
          <CategoryTabs
            value={levelFilter}
            onChange={setLevelFilter}
            items={levelTabs(classes, (item) => item.level)}
          />
          <div className="grid gap-4 md:grid-cols-2">
            {filteredClasses.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-[#0a1f5c]/10 bg-white p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-2xl font-extrabold text-[#0a1f5c]">
                      {item.name}
                    </p>
                    <p className="mt-1 text-sm font-bold text-[#64748b]">
                      {normalizeLevel(item.level)} ·{" "}
                      {item.academicYear?.name ?? "Tahun ajaran belum ada"}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#fff7e6] px-3 py-1 text-xs font-extrabold text-[#0a1f5c]">
                    {item.studentsCount ?? 0}/{item.capacity ?? "-"}
                  </span>
                </div>
                <p className="mt-5 text-sm text-[#64748b]">
                  Wali kelas:{" "}
                  <span className="font-bold text-[#0a1f5c]">
                    {item.teacher?.name ?? "Belum ditentukan"}
                  </span>
                </p>
              </article>
            ))}
            {!classesQuery.isLoading && filteredClasses.length === 0 ? (
              <EmptyState text="Belum ada kelas." />
            ) : null}
          </div>
        </Panel>
      </section>
    </div>
  );
}

export function AttendancePage() {
  const queryClient = useQueryClient();
  const [levelFilter, setLevelFilter] = useState("");
  const [date, setDate] = useState(todayInput());
  const [search, setSearch] = useState("");
  const studentsQuery = useList<Student>(
    ["students", "attendance"],
    "/students?status=active&perPage=100",
  );
  const attendanceQuery = useList<Attendance>(
    ["attendance", date],
    buildQuery("/attendance", { date, perPage: 100 }),
    Boolean(date),
  );
  const students = listFrom(studentsQuery.data);
  const attendance = listFrom(attendanceQuery.data);
  const [records, setRecords] = useState<
    Record<number, { status: AttendanceStatus; notes: string }>
  >({});
  const levelStudents = students.filter((student) =>
    matchesLevel(studentLevel(student), levelFilter),
  );
  const filteredStudents = levelStudents.filter((student) => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return true;
    return [student.fullName, student.nickname ?? "", student.nis ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(keyword);
  });
  const filteredAttendance = attendance.filter((item) => {
    const keyword = search.trim().toLowerCase();
    if (!matchesLevel(studentLevel(item.student ?? ({} as Student)), levelFilter) && !matchesLevel(item.class?.level, levelFilter)) return false;
    if (!keyword) return true;
    return [
      item.student?.fullName ?? "",
      item.student?.nis ?? "",
      statusLabel(item.status),
      item.notes ?? "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(keyword);
  });

  useEffect(() => {
    const existing = new Map<number, Attendance>();
    attendance.forEach((item) => {
      const id = item.student?.id ?? item.studentId;
      if (id) existing.set(id, item);
    });
    const next: Record<number, { status: AttendanceStatus; notes: string }> =
      {};
    students.forEach((student) => {
      const current = existing.get(student.id);
      next[student.id] = {
        status: current?.status ?? "hadir",
        notes: current?.notes ?? "",
      };
    });
    setRecords(next);
  }, [attendance, students]);

  const summary = attendanceOptions.map((statusItem) => ({
    status: statusItem,
    total: levelStudents.filter(
      (student) => records[student.id]?.status === statusItem,
    ).length,
  }));

  const save = useMutation({
    mutationFn: () =>
      apiFetch<Attendance[]>("/attendance/batch", {
        method: "POST",
        body: {
          date,
          records: levelStudents.map((student) => ({
            studentId: student.id,
            classId: student.classes?.[0]?.id,
            status: records[student.id]?.status ?? "hadir",
            notes: records[student.id]?.notes ?? "",
          })),
        },
      }),
    onSuccess: () => {
      toast.success("Absensi tersimpan");
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteAttendance = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/attendance/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Absensi dihapus");
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="grid gap-4">
      <PageHeader
        icon={<ClipboardCheck className="h-5 w-5" />}
        title="Absensi"
        description="Catat semua murid aktif dalam satu tampilan. Filter level hanya membatasi daftar."
      >
        <div className="flex w-full flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Cari murid atau NIS"
          />
          <button
            type="button"
            onClick={() => attendanceQuery.refetch()}
            className="madani-button border border-slate-200 bg-white text-[#0a1f5c]"
          >
            <RefreshCw className="h-4 w-4" />
            Muat ulang
          </button>
        </div>
      </PageHeader>

      <section className="grid min-w-0 gap-4 xl:grid-cols-[520px_1fr]">
        <Panel
          title="Catat absensi"
          description="Status bisa diubah per murid sebelum disimpan."
        >
          <CategoryTabs
            value={levelFilter}
            onChange={setLevelFilter}
            items={levelTabs(students, studentLevel)}
          />
          <div className="mb-3 grid gap-3 md:grid-cols-[220px_1fr]">
            <TextInput
              label="Tanggal"
              type="date"
              value={date}
              required
              max={todayInput()}
              onChange={setDate}
            />
          </div>

          <div className="mb-3 grid grid-cols-4 gap-2">
            {summary.map((item) => (
              <div
                key={item.status}
                className="rounded-xl border border-slate-200 bg-white p-2 text-center"
              >
                <p className="font-display text-2xl font-extrabold text-[#0a1f5c]">
                  {item.total}
                </p>
                <p className="text-[11px] font-medium text-[#64748b]">
                  {statusLabel(item.status)}
                </p>
              </div>
            ))}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate();
            }}
            className="grid gap-3"
          >
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-[13px]">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.02em] text-[#64748b]">
                    <tr>
                      <th className="h-10 border-b border-slate-200 px-3 font-semibold">
                        Murid
                      </th>
                      <th className="h-10 border-b border-slate-200 px-3 font-semibold">
                        Status
                      </th>
                      <th className="h-10 border-b border-slate-200 px-3 font-semibold">
                        Catatan
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => (
                      <tr
                        key={student.id}
                        className="border-b border-slate-100 last:border-b-0"
                      >
                        <td className="h-12 px-3">
                          <p className="font-semibold text-[#0a1f5c]">
                            {student.fullName}
                          </p>
                          <p className="text-xs text-[#64748b]">
                            {student.nis ?? "NIS belum diisi"} / {studentClass(student)}
                          </p>
                        </td>
                        <td className="h-12 px-3">
                          <div className="flex flex-wrap gap-1.5">
                            {attendanceOptions.map((statusItem) => (
                              <button
                                type="button"
                                key={statusItem}
                                onClick={() =>
                                  setRecords((current) => ({
                                    ...current,
                                    [student.id]: {
                                      ...(current[student.id] ?? { notes: "" }),
                                      status: statusItem,
                                    },
                                  }))
                                }
                                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                                  records[student.id]?.status === statusItem
                                    ? "border-[#0a1f5c] bg-[#0a1f5c] text-white"
                                    : "border-slate-200 bg-white text-[#334155]"
                                }`}
                              >
                                {statusLabel(statusItem)}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="h-12 px-3">
                          <input
                            className="madani-input"
                            value={records[student.id]?.notes ?? ""}
                            placeholder="Catatan"
                            suppressHydrationWarning
                            onChange={(event) =>
                              setRecords((current) => ({
                                ...current,
                                [student.id]: {
                                  ...(current[student.id] ?? {
                                    status: "hadir",
                                  }),
                                  notes: event.target.value,
                                },
                              }))
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!studentsQuery.isLoading && filteredStudents.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    text={
                      students.length === 0
                        ? "Belum ada murid aktif."
                        : "Tidak ada murid sesuai pencarian."
                    }
                  />
                </div>
              ) : null}
            </div>
            <SubmitButton pending={save.isPending}>Simpan absensi</SubmitButton>
          </form>
        </Panel>

        <Panel
          title="Riwayat tanggal ini"
          description="Catatan tersimpan untuk tanggal dan filter level aktif."
        >
          <CompactTable
            data={filteredAttendance}
            rowKey={(item) => item.id}
            emptyText={
              attendanceQuery.isLoading
                ? "Memuat absensi."
                : "Belum ada absensi tersimpan untuk tanggal ini."
            }
            columns={[
              {
                key: "student",
                header: "Murid",
                render: (item) => (
                  <div>
                    <p className="font-semibold text-[#0a1f5c]">{item.student?.fullName ?? "-"}</p>
                    <p className="text-xs text-[#64748b]">{item.class?.name ?? item.student?.classes?.[0]?.name ?? "-"}</p>
                  </div>
                ),
              },
              {
                key: "status",
                header: "Status",
                render: (item) => <StatusBadge value={item.status} />,
              },
              {
                key: "notes",
                header: "Catatan",
                render: (item) => item.notes ?? "-",
              },
              {
                key: "actions",
                header: "Aksi",
                className: "w-[86px]",
                render: (item) => (
                  <ActionGroup>
                    <ActionButton
                      tone="danger"
                      icon={<Trash2 className="h-3.5 w-3.5" />}
                      onClick={() => {
                        if (window.confirm("Hapus absensi ini?"))
                          deleteAttendance.mutate(item.id);
                      }}
                    >
                      Hapus
                    </ActionButton>
                  </ActionGroup>
                ),
              },
            ]}
          />
        </Panel>
      </section>
    </div>
  );
}

export function JournalsPage() {
  const queryClient = useQueryClient();
  const classes = listFrom(
    useList<SchoolClass>(["classes", "journal"], "/classes?perPage=100").data,
  );
  const [levelFilter, setLevelFilter] = useState("");
  const journalClasses = classes.filter((item) =>
    matchesLevel(item.level, levelFilter),
  );
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(todayInput());
  const [mood, setMood] = useState("happy");
  const [content, setContent] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [photos, setPhotos] = useState<File[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingJournalId, setEditingJournalId] = useState<number | null>(null);
  const studentsQuery = useList<Student>(
    ["class-students", "journal", classId],
    `/classes/${classId}/students`,
    Boolean(classId),
  );
  const journalsQuery = useList<Journal>(
    ["journals", classId, date],
    buildQuery("/journals", { classId, date, perPage: 30 }),
    Boolean(classId),
  );
  const students = listFrom(studentsQuery.data);
  const journals = listFrom(journalsQuery.data);
  const filteredJournals = journals.filter((journal) => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return true;

    return [
      journal.student?.fullName ?? "",
      journal.class?.name ?? "",
      journal.content,
      statusLabel(journal.mood),
    ]
      .join(" ")
      .toLowerCase()
      .includes(keyword);
  });

  useEffect(() => {
    if (
      journalClasses.length > 0 &&
      (!classId || !journalClasses.some((item) => String(item.id) === classId))
    ) {
      setClassId(String(journalClasses[0].id));
    }
  }, [journalClasses, classId]);

  useEffect(() => {
    if (
      students.length > 0 &&
      !students.some((student) => String(student.id) === studentId)
    ) {
      setStudentId(String(students[0].id));
    }
  }, [studentId, students]);

  function resetJournalForm() {
    setEditingJournalId(null);
    setContent("");
    setMood("happy");
    setIsPublished(true);
    setPhotos([]);
  }

  function openCreateJournal() {
    resetJournalForm();
    setFormOpen(true);
  }

  function openEditJournal(journal: Journal) {
    setEditingJournalId(journal.id);
    setClassId(journal.class?.id ? String(journal.class.id) : classId);
    setStudentId(journal.student?.id ? String(journal.student.id) : studentId);
    setDate(journal.date?.slice(0, 10) ?? date);
    setMood(journal.mood ?? "happy");
    setContent(journal.content ?? "");
    setIsPublished(journal.isPublished !== false);
    setPhotos([]);
    setFormOpen(true);
  }

  const save = useMutation({
    mutationFn: () => {
      if (editingJournalId) {
        return apiFetch<Journal>(`/journals/${editingJournalId}`, {
          method: "PUT",
          body: { content, mood, isPublished },
        });
      }

      const data = new FormData();
      data.set("studentId", studentId);
      data.set("classId", classId);
      data.set("date", date);
      data.set("mood", mood);
      data.set("content", content);
      data.set("isPublished", isPublished ? "1" : "0");
      photos.forEach((file) => data.append("photos[]", file));
      return apiFetch<Journal>("/journals", { method: "POST", body: data });
    },
    onSuccess: () => {
      toast.success("Jurnal tersimpan");
      resetJournalForm();
      queryClient.invalidateQueries({ queryKey: ["journals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setFormOpen(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteJournal = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/journals/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Jurnal dihapus");
      queryClient.invalidateQueries({ queryKey: ["journals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="grid gap-4">
      <PageHeader
        icon={<NotebookPen className="h-5 w-5" />}
        title="Jurnal"
        description="Tulis catatan perkembangan harian murid untuk orang tua."
      >
        <div className="flex w-full flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid gap-1">
            <p className="text-xs font-bold uppercase text-[#64748b]">
              Hari ini, {formatDate(todayInput())}
            </p>
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Cari murid, catatan, mood"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-[150px_170px_auto_auto]">
            <select
              className="madani-input"
              value={levelFilter}
              onChange={(event) => setLevelFilter(event.target.value)}
              suppressHydrationWarning
            >
              <option value="">Semua level</option>
              {levelOptions.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
            <input
              className="madani-input"
              type="date"
              value={date}
              max={todayInput()}
              onChange={(event) => setDate(event.target.value)}
              suppressHydrationWarning
            />
            <button
              type="button"
              onClick={openCreateJournal}
              className="madani-button bg-[#0a1f5c] text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Tulis jurnal
            </button>
            <Link
              href="/journals/archive"
              className="madani-button justify-center border border-slate-200 bg-white text-[#0a1f5c]"
            >
              Semua data
            </Link>
          </div>
        </div>
      </PageHeader>

      <DrawerForm
        open={formOpen}
        title={editingJournalId ? "Edit jurnal" : "Tulis jurnal"}
        description={
          editingJournalId
            ? "Ubah catatan, mood, dan status kirim."
            : "Satu jurnal per murid per tanggal."
        }
        onClose={() => {
          setFormOpen(false);
          resetJournalForm();
        }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
          className="grid gap-3"
        >
          <CategoryTabs
            value={levelFilter}
            onChange={setLevelFilter}
            items={levelTabs(classes, (item) => item.level)}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              label="Kelas"
              value={classId}
              required
              onChange={setClassId}
            >
              <option value="">Pilih kelas</option>
              {journalClasses.map((item) => (
                <option key={item.id} value={item.id}>
                  {classLabel(item)}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Murid"
              value={studentId}
              required
              onChange={setStudentId}
            >
              <option value="">Pilih murid</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.fullName}
                </option>
              ))}
            </SelectField>
            <TextInput
              label="Tanggal"
              type="date"
              value={date}
              required
              max={todayInput()}
              onChange={setDate}
            />
            <SelectField label="Mood" value={mood} onChange={setMood}>
              <option value="happy">Senang</option>
              <option value="neutral">Tenang</option>
              <option value="sad">Perlu didampingi</option>
              <option value="energetic">Aktif</option>
              <option value="tired">Lelah</option>
            </SelectField>
          </div>
          <TextArea
            label="Catatan"
            value={content}
            required
            rows={7}
            placeholder="Tulis aktivitas, respons anak, dan catatan guru."
            onChange={setContent}
          />
          {!editingJournalId ? (
            <FileField
              label="Foto kegiatan"
              files={photos}
              multiple
              accept="image/png,image/jpeg"
              onChange={setPhotos}
            />
          ) : null}
          <label className="flex items-center gap-3 text-xs font-semibold text-[#0a1f5c]">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(event) => setIsPublished(event.target.checked)}
            />
            Kirim ke orang tua setelah disimpan
          </label>
          <SubmitButton pending={save.isPending}>Simpan jurnal</SubmitButton>
        </form>
      </DrawerForm>

      <Panel
        title="Jurnal tersimpan"
        description={`Tanggal ${formatDate(date)}.`}
      >
        <CompactTable
          data={filteredJournals}
          rowKey={(journal) => journal.id}
          emptyText={
            journalsQuery.isLoading
              ? "Memuat jurnal."
              : "Belum ada jurnal untuk filter ini."
          }
          columns={[
            {
              key: "student",
              header: "Murid",
              render: (journal) => (
                <div>
                  <p className="font-semibold text-[#0a1f5c]">
                    {journal.student?.fullName ?? "-"}
                  </p>
                  <p className="text-xs text-[#64748b]">
                    {journal.class?.name ?? "-"} / {formatDate(journal.date)}
                  </p>
                </div>
              ),
            },
            {
              key: "mood",
              header: "Mood",
              render: (journal) => statusLabel(journal.mood),
            },
            {
              key: "content",
              header: "Catatan",
              render: (journal) => (
                <span className="line-clamp-2">{journal.content}</span>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (journal) => (
                <StatusBadge
                  value={journal.isPublished ? "active" : "pending"}
                />
              ),
            },
            {
              key: "actions",
              header: "Aksi",
              className: "w-[150px]",
              render: (journal) => (
                <ActionGroup>
                  <ActionButton
                    icon={<Pencil className="h-3.5 w-3.5" />}
                    onClick={() => openEditJournal(journal)}
                  >
                    Edit
                  </ActionButton>
                  <ActionButton
                    tone="danger"
                    icon={<Trash2 className="h-3.5 w-3.5" />}
                    onClick={() => {
                      if (window.confirm("Hapus jurnal ini?"))
                        deleteJournal.mutate(journal.id);
                    }}
                  >
                    Hapus
                  </ActionButton>
                </ActionGroup>
              ),
            },
          ]}
        />
      </Panel>
    </div>
  );
}

export function MilestonesPage() {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const students = listFrom(
    useList<Student>(["students", "milestone-options"], "/students?status=active&perPage=100")
      .data,
  );
  const areasQuery = useList<MontessoriArea>(
    ["montessori-areas"],
    "/montessori/areas",
  );
  const areas = listFrom(areasQuery.data);
  const [studentId, setStudentId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingMilestoneId, setEditingMilestoneId] = useState<number | null>(
    null,
  );
  const [milestoneForm, setMilestoneForm] = useState({
    areaId: "",
    name: "",
    level: "TK A",
    description: "",
    ageMinMonths: "",
    ageMaxMonths: "",
  });

  useEffect(() => {
    if (!areaId && areas.length > 0) setAreaId(String(areas[0].id));
    if (!milestoneForm.areaId && areas.length > 0) {
      setMilestoneForm((current) => ({
        ...current,
        areaId: String(areas[0].id),
      }));
    }
  }, [areaId, areas, milestoneForm.areaId]);

  useEffect(() => {
    if (!studentId && students.length > 0) setStudentId(String(students[0].id));
  }, [studentId, students]);

  const studentMilestoneQuery = useList<MontessoriArea>(
    ["student-milestones", studentId],
    `/milestones/student/${studentId}`,
    Boolean(studentId),
  );
  const studentAreas = listFrom(studentMilestoneQuery.data);
  const activeAreas = studentAreas.length > 0 ? studentAreas : areas;
  const activeArea =
    activeAreas.find((area) => String(area.id) === areaId) ?? activeAreas[0];
  const selectedStudent = students.find((student) => String(student.id) === studentId);
  const selectedLevel = studentLevel(selectedStudent ?? ({} as Student));
  const selectedLevelIndex = levelOptions.indexOf(selectedLevel);
  const cappedLevels =
    selectedLevelIndex >= 0
      ? levelOptions.slice(0, selectedLevelIndex + 1)
      : levelOptions;
  const milestoneLevelOptions = cappedLevels.filter((level) =>
    (activeArea?.milestones ?? []).some((milestone) =>
      matchesLevel(milestone.level, level),
    ),
  );
  const activeMilestones = (activeArea?.milestones ?? []).filter(
    (milestone) => {
      const keyword = search.trim().toLowerCase();
      if (
        milestoneLevelOptions.length > 0 &&
        !milestoneLevelOptions.some((level) =>
          matchesLevel(milestone.level, level),
        )
      ) {
        return false;
      }
      if (
        keyword &&
        ![
          milestone.name,
          milestone.description ?? "",
          normalizeLevel(milestone.level),
          statusLabel(milestone.studentStatus),
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword)
      ) {
        return false;
      }

      return matchesLevel(milestone.level, levelFilter);
    },
  );

  useEffect(() => {
    if (levelFilter && !milestoneLevelOptions.includes(levelFilter)) {
      setLevelFilter("");
    }
  }, [levelFilter, milestoneLevelOptions]);

  function resetMilestoneForm() {
    setEditingMilestoneId(null);
    setMilestoneForm((current) => ({
      ...current,
      areaId: current.areaId || (areas[0]?.id ? String(areas[0].id) : ""),
      name: "",
      level: "TK A",
      description: "",
      ageMinMonths: "",
      ageMaxMonths: "",
    }));
  }

  function openCreateMilestone() {
    resetMilestoneForm();
    setFormOpen(true);
  }

  function openEditMilestone(milestone: MontessoriMilestone) {
    const level = normalizeLevel(milestone.level);
    setEditingMilestoneId(milestone.id);
    setMilestoneForm({
      areaId: String(
        milestone.areaId ?? milestone.area?.id ?? activeArea?.id ?? "",
      ),
      name: milestone.name,
      level: levelOptions.includes(level) ? level : "TK A",
      description: milestone.description ?? "",
      ageMinMonths:
        milestone.ageMinMonths != null ? String(milestone.ageMinMonths) : "",
      ageMaxMonths:
        milestone.ageMaxMonths != null ? String(milestone.ageMaxMonths) : "",
    });
    setFormOpen(true);
  }

  const updateStatus = useMutation({
    mutationFn: ({
      milestoneId,
      status,
    }: {
      milestoneId: number;
      status: MilestoneStatus;
    }) =>
      apiFetch(`/milestones/student/${studentId}/update`, {
        method: "POST",
        body: { milestoneId, status },
      }),
    onSuccess: () => {
      toast.success("Progress tersimpan");
      queryClient.invalidateQueries({ queryKey: ["student-milestones"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const createMilestone = useMutation({
    mutationFn: () =>
      apiFetch(
        editingMilestoneId
          ? `/montessori/milestones/${editingMilestoneId}`
          : "/montessori/milestones",
        {
          method: editingMilestoneId ? "PUT" : "POST",
          body: {
            areaId: milestoneForm.areaId,
            name: milestoneForm.name,
            level: milestoneForm.level,
            description: milestoneForm.description,
            ageMinMonths: milestoneForm.ageMinMonths
              ? Number(milestoneForm.ageMinMonths)
              : undefined,
            ageMaxMonths: milestoneForm.ageMaxMonths
              ? Number(milestoneForm.ageMaxMonths)
              : undefined,
          },
        },
      ),
    onSuccess: () => {
      toast.success("Milestone tersimpan");
      resetMilestoneForm();
      queryClient.invalidateQueries({ queryKey: ["montessori-areas"] });
      queryClient.invalidateQueries({ queryKey: ["student-milestones"] });
      setFormOpen(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMilestone = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/montessori/milestones/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Milestone dihapus");
      queryClient.invalidateQueries({ queryKey: ["montessori-areas"] });
      queryClient.invalidateQueries({ queryKey: ["student-milestones"] });
    },
    onError: (error) => toast.error(error.message),
  });
  return (
    <div className="grid gap-4">
      <PageHeader
        icon={<Sparkles className="h-5 w-5" />}
        title="Montessori"
        description="Pantau progress milestone per anak dan kelola daftar milestone sekolah."
      >
        <div className="flex w-full flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid gap-1">
            <p className="text-xs font-bold uppercase text-[#64748b]">
              Hari ini, {formatDate(todayInput())}
            </p>
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Cari milestone, level, status"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {can("manage_milestone_definitions") ? (
              <button
                type="button"
                onClick={openCreateMilestone}
                className="madani-button bg-[#0a1f5c] text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah milestone
              </button>
            ) : null}
            <Link
              href="/milestones/archive"
              className="madani-button border border-slate-200 bg-white text-[#0a1f5c]"
            >
              Semua data
            </Link>
          </div>
        </div>
      </PageHeader>

      <Panel
        title="Pilih murid"
        description={selectedStudent ? `${selectedStudent.fullName} / ${studentClass(selectedStudent)}` : "Geser kartu untuk memilih murid."}
      >
        <div className="flex gap-3 overflow-x-auto pb-1">
          {students.map((student) => {
            const active = String(student.id) === studentId;
            return (
              <button
                type="button"
                key={student.id}
                onClick={() => setStudentId(String(student.id))}
                className={`min-w-[240px] rounded-xl border p-3 text-left transition ${
                  active
                    ? "border-[#0a1f5c] bg-[#0a1f5c] text-white shadow-sm"
                    : "border-slate-200 bg-white text-[#0a1f5c] hover:border-[#0a1f5c]/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <StudentPhotoFrame student={student} size="lg" active={active} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{student.fullName}</p>
                    <p className={`mt-0.5 text-xs ${active ? "text-white/72" : "text-[#64748b]"}`}>{student.nis ?? "NIS belum diisi"}</p>
                    <p className={`mt-1 text-xs font-semibold ${active ? "text-white" : "text-[#0a1f5c]"}`}>{studentClass(student)}</p>
                  </div>
                </div>
              </button>
            );
          })}
          {students.length === 0 ? <EmptyState text="Belum ada murid aktif." /> : null}
        </div>
      </Panel>

      <DrawerForm
        open={formOpen && can("manage_milestone_definitions")}
        title={editingMilestoneId ? "Edit milestone" : "Tambah milestone"}
        description="Checklist sekolah bisa ditambah manual."
        onClose={() => {
          setFormOpen(false);
          resetMilestoneForm();
        }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            createMilestone.mutate();
          }}
          className="grid gap-3"
        >
          <SelectField
            label="Area"
            value={milestoneForm.areaId}
            required
            onChange={(value) =>
              setMilestoneForm({ ...milestoneForm, areaId: value })
            }
          >
            <option value="">Pilih area</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </SelectField>
          <TextInput
            label="Nama milestone"
            value={milestoneForm.name}
            required
            onChange={(value) =>
              setMilestoneForm({ ...milestoneForm, name: value })
            }
          />
          <SelectField
            label="Level"
            value={milestoneForm.level}
            onChange={(value) =>
              setMilestoneForm({ ...milestoneForm, level: value })
            }
          >
            {levelOptions.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </SelectField>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput
              label="Usia min. bulan"
              type="number"
              value={milestoneForm.ageMinMonths}
              onChange={(value) =>
                setMilestoneForm({ ...milestoneForm, ageMinMonths: value })
              }
            />
            <TextInput
              label="Usia maks. bulan"
              type="number"
              value={milestoneForm.ageMaxMonths}
              onChange={(value) =>
                setMilestoneForm({ ...milestoneForm, ageMaxMonths: value })
              }
            />
          </div>
          <TextArea
            label="Deskripsi"
            value={milestoneForm.description}
            onChange={(value) =>
              setMilestoneForm({ ...milestoneForm, description: value })
            }
          />
          <SubmitButton pending={createMilestone.isPending}>
            Simpan milestone
          </SubmitButton>
        </form>
      </DrawerForm>

      <Panel
        title="Checklist perkembangan"
        description="Ubah status sesuai hasil observasi."
      >
        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
          {activeAreas.map((area) => (
            <button
              type="button"
              key={area.id}
              onClick={() => setAreaId(String(area.id))}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                String(area.id) === String(activeArea?.id)
                  ? "border-[#0a1f5c] bg-[#0a1f5c] text-white"
                  : "border-slate-200 bg-white text-[#334155]"
              }`}
            >
              {area.name}
            </button>
          ))}
        </div>
        <CategoryTabs
          value={levelFilter}
          onChange={setLevelFilter}
          items={[
            {
              value: "",
              label: "Semua",
              count: (activeArea?.milestones ?? []).filter((milestone) =>
                milestoneLevelOptions.some((level) =>
                  matchesLevel(milestone.level, level),
                ),
              ).length,
            },
            ...milestoneLevelOptions.map((level) => ({
              value: level,
              label: level,
              count: (activeArea?.milestones ?? []).filter((milestone) =>
                matchesLevel(milestone.level, level),
              ).length,
            })),
          ]}
        />

        <div className="[&_tbody_td]:py-3">
          <CompactTable
            data={activeMilestones}
            rowKey={(milestone) => milestone.id}
            emptyText={
              areasQuery.isLoading
                ? "Memuat milestone."
                : "Belum ada milestone di area ini."
            }
            columns={[
            {
              key: "milestone",
              header: "Milestone",
              render: (milestone) => (
                <div>
                  <p className="font-semibold text-[#0a1f5c]">
                    {milestone.name}
                  </p>
                  <p className="line-clamp-1 text-xs text-[#64748b]">
                    {milestone.description ?? "Belum ada deskripsi."}
                  </p>
                </div>
              ),
            },
            {
              key: "level",
              header: "Level",
              render: (milestone) => normalizeLevel(milestone.level),
            },
            {
              key: "status",
              header: "Status",
              render: (milestone) => (
                <StatusBadge value={milestone.studentStatus ?? "not_started"} />
              ),
            },
            {
              key: "actions",
              header: "Aksi",
              className: "min-w-[420px]",
              render: (milestone) => (
                <ActionGroup>
                  {can("update_student_milestones")
                    ? milestoneOptions.map((status) => (
                        <button
                          type="button"
                          key={status}
                          disabled={!studentId || updateStatus.isPending}
                          onClick={() =>
                            updateStatus.mutate({
                              milestoneId: milestone.id,
                              status,
                            })
                          }
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                            (milestone.studentStatus ?? "not_started") ===
                            status
                              ? "border-[#0a1f5c] bg-[#0a1f5c] text-white"
                              : "border-slate-200 bg-white text-[#334155]"
                          }`}
                        >
                          {statusLabel(status)}
                        </button>
                      ))
                    : null}
                  {can("manage_milestone_definitions") ? (
                    <ActionButton
                      icon={<Pencil className="h-3.5 w-3.5" />}
                      onClick={() => openEditMilestone(milestone)}
                    >
                      Edit
                    </ActionButton>
                  ) : null}
                  {can("manage_milestone_definitions") ? (
                    <ActionButton
                      tone="danger"
                      icon={<Trash2 className="h-3.5 w-3.5" />}
                      onClick={() => {
                        if (
                          window.confirm(`Hapus milestone ${milestone.name}?`)
                        )
                          deleteMilestone.mutate(milestone.id);
                      }}
                    >
                      Hapus
                    </ActionButton>
                  ) : null}
                  {!can("update_student_milestones") &&
                  !can("manage_milestone_definitions") ? (
                    <span className="text-xs font-semibold text-[#64748b]">
                      Lihat saja
                    </span>
                  ) : null}
                </ActionGroup>
              ),
            },
            ]}
          />
        </div>
      </Panel>
    </div>
  );
}

export function ReportsPage() {
  const queryClient = useQueryClient();
  const reports = listFrom(
    useList<Report>(["reports"], "/reports?perPage=100").data,
  );
  const students = listFrom(
    useList<Student>(["students", "report-options"], "/students?perPage=100")
      .data,
  );
  const classes = listFrom(
    useList<SchoolClass>(["classes", "report-options"], "/classes?perPage=100")
      .data,
  );
  const years = listFrom(
    useList<AcademicYear>(
      ["academic-years", "report-options"],
      "/academic-years",
    ).data,
  );
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingReportId, setEditingReportId] = useState<number | null>(null);
  const filteredReports = reports.filter((report) => {
    const keyword = search.trim().toLowerCase();
    if (
      keyword &&
      ![
        report.student?.fullName ?? "",
        report.class?.name ?? "",
        report.academicYear?.name ?? "",
        `semester ${report.semester}`,
        report.generalNotes ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    ) {
      return false;
    }

    return matchesLevel(report.class?.level, levelFilter);
  });
  const [form, setForm] = useState({
    studentId: "",
    classId: "",
    academicYearId: "",
    semester: "1",
    generalNotes: "",
    characterNotes: "",
    recommendation: "",
  });

  useEffect(() => {
    if (!form.academicYearId && years.length > 0) {
      setForm((current) => ({
        ...current,
        academicYearId: String(
          years.find((year) => year.isActive)?.id ?? years[0].id,
        ),
      }));
    }
  }, [form.academicYearId, years]);

  function resetReportForm() {
    setEditingReportId(null);
    setForm((current) => ({
      studentId: "",
      classId: "",
      academicYearId: current.academicYearId || "",
      semester: "1",
      generalNotes: "",
      characterNotes: "",
      recommendation: "",
    }));
  }

  function openCreateReport() {
    resetReportForm();
    setFormOpen(true);
  }

  function openEditReport(report: Report) {
    setEditingReportId(report.id);
    setForm({
      studentId: report.student?.id ? String(report.student.id) : "",
      classId: report.class?.id ? String(report.class.id) : "",
      academicYearId: report.academicYear?.id
        ? String(report.academicYear.id)
        : "",
      semester: report.semester ?? "1",
      generalNotes: report.generalNotes ?? "",
      characterNotes: report.characterNotes ?? "",
      recommendation: report.recommendation ?? "",
    });
    setFormOpen(true);
  }

  const save = useMutation({
    mutationFn: () =>
      apiFetch<Report>(
        editingReportId ? `/reports/${editingReportId}` : "/reports",
        { method: editingReportId ? "PUT" : "POST", body: form },
      ),
    onSuccess: () => {
      toast.success("Draft raport tersimpan");
      resetReportForm();
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      setFormOpen(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const publish = useMutation({
    mutationFn: (id: number) =>
      apiFetch<Report>(`/reports/${id}/publish`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Raport dipublish");
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteReport = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/reports/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Raport dihapus");
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="grid gap-4">
      <PageHeader
        icon={<FileSignature className="h-5 w-5" />}
        title="Raport"
        description="Susun draft, cek status tanda tangan, dan publish PDF raport."
      >
        <div className="flex w-full flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Cari murid, kelas, semester"
          />
          <button
            type="button"
            onClick={openCreateReport}
            className="madani-button bg-[#0a1f5c] text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            Draft raport
          </button>
        </div>
      </PageHeader>

      <DrawerForm
        open={formOpen}
        title={editingReportId ? "Edit raport" : "Draft raport"}
        description="Pilih murid, kelas, tahun ajaran, dan semester."
        onClose={() => {
          setFormOpen(false);
          resetReportForm();
        }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
          className="grid gap-3"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <SelectField
              label="Murid"
              value={form.studentId}
              required
              onChange={(value) => setForm({ ...form, studentId: value })}
            >
              <option value="">Pilih murid</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.fullName}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Kelas"
              value={form.classId}
              required
              onChange={(value) => setForm({ ...form, classId: value })}
            >
              <option value="">Pilih kelas</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {classLabel(item)}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Tahun ajaran"
              value={form.academicYearId}
              required
              onChange={(value) => setForm({ ...form, academicYearId: value })}
            >
              <option value="">Pilih tahun ajaran</option>
              {years.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Semester"
              value={form.semester}
              required
              onChange={(value) => setForm({ ...form, semester: value })}
            >
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
            </SelectField>
          </div>
          <TextArea
            label="Catatan umum"
            value={form.generalNotes}
            onChange={(value) => setForm({ ...form, generalNotes: value })}
          />
          <TextArea
            label="Karakter"
            value={form.characterNotes}
            onChange={(value) => setForm({ ...form, characterNotes: value })}
          />
          <TextArea
            label="Rekomendasi"
            value={form.recommendation}
            onChange={(value) => setForm({ ...form, recommendation: value })}
          />
          <SubmitButton pending={save.isPending}>Simpan draft</SubmitButton>
        </form>
      </DrawerForm>

      <Panel
        title="Daftar raport"
        description={`${filteredReports.length} draft atau publish.`}
      >
        <CategoryTabs
          value={levelFilter}
          onChange={setLevelFilter}
          items={levelTabs(reports, (report) => report.class?.level)}
        />
        <CompactTable
          data={filteredReports}
          rowKey={(report) => report.id}
          emptyText="Belum ada draft raport."
          columns={[
            {
              key: "student",
              header: "Murid",
              render: (report) => (
                <div>
                  <p className="font-semibold text-[#0a1f5c]">
                    {report.student?.fullName ?? "-"}
                  </p>
                  <p className="text-xs text-[#64748b]">
                    {report.class?.name ?? "-"} / Semester {report.semester}
                  </p>
                </div>
              ),
            },
            {
              key: "year",
              header: "Tahun ajaran",
              render: (report) => report.academicYear?.name ?? "-",
            },
            {
              key: "signature",
              header: "Status",
              render: (report) => (
                <StatusBadge
                  value={
                    report.signatureStatus ??
                    (report.publishedAt ? "visual_signed" : "pending")
                  }
                />
              ),
            },
            {
              key: "actions",
              header: "Aksi",
              className: "w-[320px]",
              render: (report) => (
                <ActionGroup>
                  <ActionButton
                    icon={<Pencil className="h-3.5 w-3.5" />}
                    onClick={() => openEditReport(report)}
                  >
                    Edit
                  </ActionButton>
                  <ActionButton
                    tone="primary"
                    icon={<FileSignature className="h-3.5 w-3.5" />}
                    onClick={() => publish.mutate(report.id)}
                  >
                    Publish PDF
                  </ActionButton>
                  {report.pdfUrl ? (
                    <a
                      className="inline-flex h-8 items-center justify-center whitespace-nowrap rounded-full border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-[#0a1f5c]"
                      href={report.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Buka PDF
                    </a>
                  ) : null}
                  <ActionButton
                    tone="danger"
                    icon={<Trash2 className="h-3.5 w-3.5" />}
                    onClick={() => {
                      if (window.confirm("Hapus raport ini?"))
                        deleteReport.mutate(report.id);
                    }}
                  >
                    Hapus
                  </ActionButton>
                </ActionGroup>
              ),
            },
          ]}
        />
      </Panel>
    </div>
  );
}

export function AnnouncementsPage() {
  const queryClient = useQueryClient();
  const announcements = listFrom(
    useList<Announcement>(["announcements"], "/announcements?perPage=100").data,
  );
  const classes = listFrom(
    useList<SchoolClass>(
      ["classes", "announcement-options"],
      "/classes?perPage=100",
    ).data,
  );
  const parents = listFrom(
    useSafeList<User>(["users", "parent-options"], "/users?perPage=100").data,
  ).filter((user) => roleNames(user).includes("orang_tua"));
  const [search, setSearch] = useState("");
  const [announcementFilter, setAnnouncementFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<
    number | null
  >(null);
  const [form, setForm] = useState({
    title: "",
    content: "",
    target: "all",
    targetClassId: "",
    targetUserId: "",
    isUrgent: false,
  });

  function resetAnnouncementForm() {
    setEditingAnnouncementId(null);
    setForm({
      title: "",
      content: "",
      target: "all",
      targetClassId: "",
      targetUserId: "",
      isUrgent: false,
    });
  }

  function openCreateAnnouncement() {
    resetAnnouncementForm();
    setFormOpen(true);
  }

  function openEditAnnouncement(item: Announcement) {
    setEditingAnnouncementId(item.id);
    setForm({
      title: item.title,
      content: item.content ?? "",
      target: item.target,
      targetClassId: item.targetClassIds?.[0]
        ? String(item.targetClassIds[0])
        : "",
      targetUserId: item.targetUserIds?.[0]
        ? String(item.targetUserIds[0])
        : "",
      isUrgent: Boolean(item.isUrgent),
    });
    setFormOpen(true);
  }

  const save = useMutation({
    mutationFn: () =>
      apiFetch<Announcement>(
        editingAnnouncementId
          ? `/announcements/${editingAnnouncementId}`
          : "/announcements",
        {
          method: editingAnnouncementId ? "PUT" : "POST",
          body: {
            title: form.title,
            content: form.content,
            target: form.target,
            targetClassIds:
              form.target === "class" && form.targetClassId
                ? [Number(form.targetClassId)]
                : [],
            targetUserIds:
              form.target === "specific_parents" && form.targetUserId
                ? [Number(form.targetUserId)]
                : [],
            isUrgent: form.isUrgent,
          },
        },
      ),
    onSuccess: () => {
      toast.success("Pengumuman tersimpan");
      resetAnnouncementForm();
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      setFormOpen(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const publish = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/announcements/${id}/publish`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Pengumuman dikirim");
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteAnnouncement = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/announcements/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Pengumuman dihapus");
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (error) => toast.error(error.message),
  });
  const filteredAnnouncements = announcements.filter((item) => {
    const keyword = search.trim().toLowerCase();
    if (
      keyword &&
      ![
        item.title,
        item.content ?? "",
        item.target,
        item.isUrgent ? "penting" : "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    ) {
      return false;
    }
    if (announcementFilter === "urgent") return Boolean(item.isUrgent);
    if (announcementFilter === "published") return Boolean(item.publishedAt);
    if (announcementFilter) return item.target === announcementFilter;
    return true;
  });

  return (
    <div className="grid gap-4">
      <PageHeader
        icon={<Megaphone className="h-5 w-5" />}
        title="Pengumuman"
        description="Tulis pesan sekolah, tentukan penerima, lalu publish ke orang tua."
      >
        <div className="flex w-full flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Cari pengumuman"
          />
          <button
            type="button"
            onClick={openCreateAnnouncement}
            className="madani-button bg-[#0a1f5c] text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            Tulis pengumuman
          </button>
        </div>
      </PageHeader>

      <DrawerForm
        open={formOpen}
        title={editingAnnouncementId ? "Edit pengumuman" : "Tulis pengumuman"}
        description="Preview pesan tampil sebelum disimpan."
        onClose={() => {
          setFormOpen(false);
          resetAnnouncementForm();
        }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
          className="grid gap-3"
        >
          <TextInput
            label="Judul"
            value={form.title}
            required
            onChange={(value) => setForm({ ...form, title: value })}
          />
          <SelectField
            label="Penerima"
            value={form.target}
            required
            onChange={(value) => setForm({ ...form, target: value })}
          >
            <option value="all">Semua orang tua</option>
            <option value="class">Kelas tertentu</option>
            <option value="specific_parents">Orang tua tertentu</option>
          </SelectField>
          {form.target === "class" ? (
            <SelectField
              label="Kelas tujuan"
              value={form.targetClassId}
              required
              onChange={(value) => setForm({ ...form, targetClassId: value })}
            >
              <option value="">Pilih kelas</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {classLabel(item)}
                </option>
              ))}
            </SelectField>
          ) : null}
          {form.target === "specific_parents" ? (
            <SelectField
              label="Orang tua"
              value={form.targetUserId}
              required
              onChange={(value) => setForm({ ...form, targetUserId: value })}
            >
              <option value="">Pilih orang tua</option>
              {parents.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.name}
                </option>
              ))}
            </SelectField>
          ) : null}
          <TextArea
            label="Isi pengumuman"
            value={form.content}
            required
            rows={7}
            onChange={(value) => setForm({ ...form, content: value })}
          />
          <label className="flex items-center gap-3 text-xs font-semibold text-[#0a1f5c]">
            <input
              type="checkbox"
              checked={form.isUrgent}
              onChange={(event) =>
                setForm({ ...form, isUrgent: event.target.checked })
              }
            />
            Tandai penting
          </label>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-bold uppercase text-[#64748b]">
              Preview
            </p>
            <p className="mt-2 font-semibold text-[#0a1f5c]">
              {form.title || "Judul pengumuman"}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#334155]">
              {form.content || "Isi pesan akan tampil di sini."}
            </p>
          </div>
          <SubmitButton pending={save.isPending}>
            Simpan pengumuman
          </SubmitButton>
        </form>
      </DrawerForm>

      <Panel
        title="Pengumuman tersimpan"
        description={`${filteredAnnouncements.length} pesan tampil.`}
      >
        <CategoryTabs
          value={announcementFilter}
          onChange={setAnnouncementFilter}
          items={[
            { value: "", label: "Semua", count: announcements.length },
            {
              value: "all",
              label: "Semua orang tua",
              count: announcements.filter((item) => item.target === "all")
                .length,
            },
            {
              value: "class",
              label: "Kelas",
              count: announcements.filter((item) => item.target === "class")
                .length,
            },
            {
              value: "specific_parents",
              label: "Orang tua",
              count: announcements.filter(
                (item) => item.target === "specific_parents",
              ).length,
            },
            {
              value: "urgent",
              label: "Penting",
              count: announcements.filter((item) => item.isUrgent).length,
            },
          ]}
        />
        <CompactTable
          data={filteredAnnouncements}
          rowKey={(item) => item.id}
          emptyText="Belum ada pengumuman."
          columns={[
            {
              key: "title",
              header: "Pengumuman",
              render: (item) => (
                <div>
                  <p className="font-semibold text-[#0a1f5c]">{item.title}</p>
                  <p className="line-clamp-1 text-xs text-[#64748b]">
                    {item.content}
                  </p>
                </div>
              ),
            },
            {
              key: "target",
              header: "Penerima",
              render: (item) =>
                item.target === "all"
                  ? "Semua orang tua"
                  : item.target === "class"
                    ? "Kelas tertentu"
                    : "Orang tua tertentu",
            },
            {
              key: "published",
              header: "Tanggal",
              render: (item) =>
                item.publishedAt ? formatDate(item.publishedAt) : "-",
            },
            {
              key: "status",
              header: "Status",
              render: (item) => (
                <StatusBadge value={item.publishedAt ? "active" : "pending"} />
              ),
            },
            {
              key: "actions",
              header: "Aksi",
              className: "w-[220px]",
              render: (item) => (
                <ActionGroup>
                  <ActionButton
                    icon={<Pencil className="h-3.5 w-3.5" />}
                    onClick={() => openEditAnnouncement(item)}
                  >
                    Edit
                  </ActionButton>
                  {!item.publishedAt ? (
                    <ActionButton
                      tone="primary"
                      icon={<Send className="h-3.5 w-3.5" />}
                      onClick={() => publish.mutate(item.id)}
                    >
                      Publish
                    </ActionButton>
                  ) : null}
                  <ActionButton
                    tone="danger"
                    icon={<Trash2 className="h-3.5 w-3.5" />}
                    onClick={() => {
                      if (window.confirm(`Hapus pengumuman ${item.title}?`))
                        deleteAnnouncement.mutate(item.id);
                    }}
                  >
                    Hapus
                  </ActionButton>
                </ActionGroup>
              ),
            },
          ]}
        />
      </Panel>
    </div>
  );
}

export function AgendasPage() {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(String(currentMonth()));
  const [year, setYear] = useState(String(currentYear()));
  const [selectedDate, setSelectedDate] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingAgendaId, setEditingAgendaId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [agendaTypeFilter, setAgendaTypeFilter] = useState("");
  const agendasQuery = useList<Agenda>(
    ["agendas", month, year],
    buildQuery("/agendas", { month, year }),
  );
  const agendas = listFrom(agendasQuery.data);
  const [form, setForm] = useState({
    title: "",
    description: "",
    startDate: todayInput(),
    endDate: "",
    location: "",
    type: "kegiatan",
    affectsAttendance: false,
  });
  const numericMonth = Number(month);
  const numericYear = Number(year);
  const firstDate = new Date(numericYear, numericMonth - 1, 1);
  const leadingDays = (firstDate.getDay() + 6) % 7;
  const daysInMonth = new Date(numericYear, numericMonth, 0).getDate();
  const totalCells = Math.ceil((leadingDays + daysInMonth) / 7) * 7;
  const calendarCells = Array.from({ length: totalCells }, (_, index) => {
    const dayNumber = index - leadingDays + 1;
    if (dayNumber < 1 || dayNumber > daysInMonth) return null;
    const date = `${numericYear}-${String(numericMonth).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;
    const items = agendas.filter(
      (item) => item.startDate?.slice(0, 10) === date,
    );
    return { dayNumber, date, items };
  });
  const visibleAgendasBase = selectedDate
    ? agendas.filter((item) => item.startDate?.slice(0, 10) === selectedDate)
    : agendas;
  const visibleAgendas = visibleAgendasBase.filter((item) => {
    const keyword = search.trim().toLowerCase();
    if (
      keyword &&
      ![
        item.title,
        item.description ?? "",
        item.location ?? "",
        statusLabel(item.type),
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    ) {
      return false;
    }

    return !agendaTypeFilter || item.type === agendaTypeFilter;
  });

  function resetAgendaForm(date = selectedDate || todayInput()) {
    setEditingAgendaId(null);
    setForm({
      title: "",
      description: "",
      startDate: date,
      endDate: "",
      location: "",
      type: "kegiatan",
      affectsAttendance: false,
    });
  }

  function chooseAgendaDate(date: string) {
    setSelectedDate(date);
    resetAgendaForm(date);
    setFormOpen(true);
  }

  function openEditAgenda(item: Agenda) {
    const date = item.startDate?.slice(0, 10) ?? todayInput();
    setSelectedDate(date);
    setEditingAgendaId(item.id);
    setForm({
      title: item.title,
      description: item.description ?? "",
      startDate: date,
      endDate: item.endDate?.slice(0, 10) ?? "",
      location: item.location ?? "",
      type: item.type,
      affectsAttendance: Boolean(item.affectsAttendance),
    });
    setFormOpen(true);
  }

  const save = useMutation({
    mutationFn: () =>
      apiFetch<Agenda>(
        editingAgendaId ? `/agendas/${editingAgendaId}` : "/agendas",
        {
          method: editingAgendaId ? "PUT" : "POST",
          body: {
            ...form,
            endDate: form.endDate || undefined,
          },
        },
      ),
    onSuccess: () => {
      toast.success("Agenda tersimpan");
      resetAgendaForm();
      queryClient.invalidateQueries({ queryKey: ["agendas"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setFormOpen(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteAgenda = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/agendas/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Agenda dihapus");
      queryClient.invalidateQueries({ queryKey: ["agendas"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="grid gap-4">
      <PageHeader
        icon={<CalendarDays className="h-5 w-5" />}
        title="Agenda"
        description="Catat kegiatan, libur, rapat, lomba, dan penerimaan sekolah."
      >
        <div className="flex w-full flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Cari agenda, lokasi, tipe"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              className="madani-input"
              value={month}
              suppressHydrationWarning
              onChange={(event) => {
                setMonth(event.target.value);
                setSelectedDate("");
              }}
            >
              {Array.from({ length: 12 }, (_, index) => index + 1).map(
                (item) => (
                  <option key={item} value={item}>
                    {new Date(2026, item - 1, 1).toLocaleString("id-ID", {
                      month: "long",
                    })}
                  </option>
                ),
              )}
            </select>
            <input
              className="madani-input"
              value={year}
              suppressHydrationWarning
              onChange={(event) => {
                setYear(event.target.value);
                setSelectedDate("");
              }}
            />
          </div>
        </div>
      </PageHeader>

      <DrawerForm
        open={formOpen}
        title={editingAgendaId ? "Edit agenda" : "Tambah agenda"}
        description={
          selectedDate ? formatDate(selectedDate) : "Pilih tanggal di kalender."
        }
        onClose={() => {
          setFormOpen(false);
          resetAgendaForm();
        }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
          className="grid gap-3"
        >
          <TextInput
            label="Judul"
            value={form.title}
            required
            onChange={(value) => setForm({ ...form, title: value })}
          />
          <SelectField
            label="Tipe"
            value={form.type}
            required
            onChange={(value) => setForm({ ...form, type: value })}
          >
            <option value="kegiatan">Kegiatan</option>
            <option value="libur">Libur</option>
            <option value="rapat">Rapat</option>
            <option value="lomba">Lomba</option>
            <option value="penerimaan">Penerimaan</option>
          </SelectField>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput
              label="Tanggal mulai"
              type="date"
              value={form.startDate}
              required
              onChange={(value) => setForm({ ...form, startDate: value })}
            />
            <TextInput
              label="Tanggal akhir"
              type="date"
              value={form.endDate}
              onChange={(value) => setForm({ ...form, endDate: value })}
            />
          </div>
          <TextInput
            label="Lokasi"
            value={form.location}
            onChange={(value) => setForm({ ...form, location: value })}
          />
          <TextArea
            label="Catatan"
            value={form.description}
            onChange={(value) => setForm({ ...form, description: value })}
          />
          <label className="flex items-center gap-3 text-xs font-semibold text-[#0a1f5c]">
            <input
              type="checkbox"
              checked={form.affectsAttendance}
              onChange={(event) =>
                setForm({ ...form, affectsAttendance: event.target.checked })
              }
            />
            Berpengaruh ke absensi
          </label>
          <SubmitButton pending={save.isPending}>Simpan agenda</SubmitButton>
        </form>
      </DrawerForm>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel
          title={selectedDate ? "Agenda tanggal ini" : "Agenda bulan ini"}
          description={
            selectedDate
              ? formatDate(selectedDate)
              : `${agendas.length} agenda tampil.`
          }
        >
          <CategoryTabs
            value={agendaTypeFilter}
            onChange={setAgendaTypeFilter}
            items={[
              { value: "", label: "Semua", count: visibleAgendasBase.length },
              ...["kegiatan", "libur", "rapat", "lomba", "penerimaan"].map(
                (type) => ({
                  value: type,
                  label: statusLabel(type),
                  count: visibleAgendasBase.filter((item) => item.type === type)
                    .length,
                }),
              ),
            ]}
          />
          <CompactTable
            data={visibleAgendas}
            rowKey={(item) => item.id}
            emptyText={
              selectedDate
                ? "Tidak ada agenda pada tanggal ini."
                : "Tidak ada agenda pada bulan ini."
            }
            columns={[
              {
                key: "date",
                header: "Tanggal",
                render: (item) => formatDate(item.startDate),
              },
              {
                key: "title",
                header: "Agenda",
                render: (item) => (
                  <div>
                    <p className="font-semibold text-[#0a1f5c]">{item.title}</p>
                    <p className="line-clamp-1 text-xs text-[#64748b]">
                      {item.description ?? "Tidak ada catatan."}
                    </p>
                  </div>
                ),
              },
              {
                key: "type",
                header: "Tipe",
                render: (item) => <StatusBadge value={item.type} />,
              },
              {
                key: "location",
                header: "Lokasi",
                render: (item) => item.location ?? "-",
              },
              {
                key: "end",
                header: "Selesai",
                render: (item) =>
                  item.endDate ? formatDate(item.endDate) : "-",
              },
              {
                key: "actions",
                header: "Aksi",
                className: "w-[150px]",
                render: (item) => (
                  <ActionGroup>
                    <ActionButton
                      icon={<Pencil className="h-3.5 w-3.5" />}
                      onClick={() => openEditAgenda(item)}
                    >
                      Edit
                    </ActionButton>
                    <ActionButton
                      tone="danger"
                      icon={<Trash2 className="h-3.5 w-3.5" />}
                      onClick={() => {
                        if (window.confirm(`Hapus agenda ${item.title}?`))
                          deleteAgenda.mutate(item.id);
                      }}
                    >
                      Hapus
                    </ActionButton>
                  </ActionGroup>
                ),
              },
            ]}
          />
        </Panel>

        <Panel title="Kalender" description="Klik tanggal untuk tambah agenda.">
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-[#64748b]">
            {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1">
            {calendarCells.map((cell, index) =>
              cell ? (
                <button
                  type="button"
                  key={cell.date}
                  onClick={() => chooseAgendaDate(cell.date)}
                  className={`relative min-h-10 rounded-lg border p-1.5 text-left text-xs transition ${
                    selectedDate === cell.date
                      ? "border-[#0a1f5c] bg-slate-50"
                      : "border-slate-200 bg-white hover:border-[#0a1f5c]/30"
                  }`}
                >
                  <span className="font-bold text-[#0a1f5c]">
                    {cell.dayNumber}
                  </span>
                  {cell.items.length > 0 ? (
                    <span className="absolute bottom-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[#0a1f5c]" />
                  ) : null}
                </button>
              ) : (
                <div
                  key={`empty-${index}`}
                  className="min-h-10 rounded-lg border border-dashed border-slate-200 bg-white/50"
                />
              ),
            )}
          </div>
        </Panel>
      </section>
    </div>
  );
}

const emptyEnrollmentForm = {
  category: "new_student" as EnrollmentCategory,
  fullName: "",
  programLevel: "",
  address: "",
  targetAmount: "",
  paidAmount: "0",
  paymentStatus: "unpaid" as EnrollmentPaymentStatus,
  confirmationStatus: "pending" as EnrollmentConfirmationStatus,
  sourceText: "",
  notes: "",
};

function enrollmentPaymentStatus(targetAmount: string, paidAmount: string) {
  const target = Number(targetAmount || 0);
  const paid = Number(paidAmount || 0);
  if (target > 0 && paid >= target) return "paid";
  return paid > 0 ? "partial" : "unpaid";
}

function isEnrollmentFinancial(category: EnrollmentCategory) {
  return category === "new_student" || category === "re_registration";
}

function enrollmentConfirmationStatus(
  category: EnrollmentCategory,
  paidAmount: string,
) {
  if (category === "graduated") return "graduated";
  if (category === "prep_class") return "continuing";
  if (category === "not_continuing") return "not_continuing";
  if (category === "unconfirmed") return "unconfirmed";
  return Number(paidAmount || 0) > 0 ? "confirmed" : "pending";
}

export function EnrollmentUpdatesPage() {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EnrollmentUpdate | null>(null);
  const [form, setForm] = useState(emptyEnrollmentForm);
  const query = useList<EnrollmentUpdate>(
    ["enrollment-updates", search, category, paymentStatus],
    buildQuery("/enrollment-updates", {
      search,
      category,
      paymentStatus,
    }),
  );
  const summaryQuery = useQuery({
    queryKey: ["enrollment-updates-summary"],
    queryFn: () => apiFetch<EnrollmentSummary>("/enrollment-updates/summary"),
  });
  const rows = listFrom(query.data);
  const summary = summaryQuery.data?.data;

  function openCreate() {
    setEditing(null);
    setForm(emptyEnrollmentForm);
    setFormOpen(true);
  }

  function openEdit(row: EnrollmentUpdate) {
    setEditing(row);
    setForm({
      category: row.category,
      fullName: row.fullName,
      programLevel: row.programLevel ?? "",
      address: row.address ?? "",
      targetAmount: row.targetAmount === null || row.targetAmount === undefined ? "" : String(row.targetAmount),
      paidAmount: String(row.paidAmount ?? 0),
      paymentStatus: row.paymentStatus,
      confirmationStatus: row.confirmationStatus,
      sourceText: row.sourceText ?? "",
      notes: row.notes ?? "",
    });
    setFormOpen(true);
  }

  function setAmount(key: "targetAmount" | "paidAmount", value: string) {
    const next = { ...form, [key]: value };
    if (isEnrollmentFinancial(next.category)) {
      next.paymentStatus = enrollmentPaymentStatus(
        next.targetAmount,
        next.paidAmount,
      );
      next.confirmationStatus = enrollmentConfirmationStatus(
        next.category,
        next.paidAmount,
      );
    } else {
      next.paymentStatus = "not_applicable";
      next.confirmationStatus = enrollmentConfirmationStatus(
        next.category,
        next.paidAmount,
      );
    }
    setForm(next);
  }

  const save = useMutation({
    mutationFn: () =>
      apiFetch(
        editing ? `/enrollment-updates/${editing.id}` : "/enrollment-updates",
        {
          method: editing ? "PUT" : "POST",
          body: {
            category: form.category,
            fullName: form.fullName,
            programLevel: form.programLevel || undefined,
            address: form.address || undefined,
            targetAmount: form.targetAmount ? Number(form.targetAmount) : null,
            paidAmount: Number(form.paidAmount || 0),
            paymentStatus: form.paymentStatus,
            confirmationStatus: form.confirmationStatus,
            sourceText: form.sourceText || undefined,
            notes: form.notes || undefined,
          },
        },
      ),
    onSuccess: () => {
      toast.success("Update pendaftaran tersimpan");
      setFormOpen(false);
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["enrollment-updates"] });
      queryClient.invalidateQueries({ queryKey: ["enrollment-updates-summary"] });
      queryClient.invalidateQueries({ queryKey: ["fees-summary"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/enrollment-updates/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Update pendaftaran dihapus");
      queryClient.invalidateQueries({ queryKey: ["enrollment-updates"] });
      queryClient.invalidateQueries({ queryKey: ["enrollment-updates-summary"] });
      queryClient.invalidateQueries({ queryKey: ["fees-summary"] });
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="grid gap-4">
      <Breadcrumbs
        items={[
          { label: "Keuangan", href: "/fees" },
          { label: "Uang Pendaftaran" },
        ]}
      />
      <PageHeader
        icon={<BadgeCheck className="h-5 w-5" />}
        title="Uang Pendaftaran"
        description="Rekap manual siswa baru, daftar ulang, status lanjut, dan pembayaran."
      >
        <div className="flex w-full flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Cari nama, alamat, catatan"
          />
          {can("manage_registrations") ? (
            <button
              type="button"
              onClick={openCreate}
              className="madani-button bg-[#0a1f5c] text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Data baru
            </button>
          ) : null}
        </div>
      </PageHeader>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <CompactStatCard label="Total Target" value={compactMoney(summary?.target)} description="Siswa baru + daftar ulang" borderColor="blue" />
        <CompactStatCard label="Sudah Masuk" value={compactMoney(summary?.paid)} description={`${summary?.paidCount ?? 0} data lunas`} borderColor="emerald" />
        <CompactStatCard label="Sisa Tercatat" value={compactMoney(summary?.outstanding)} description={`${summary?.partialCount ?? 0} data partial`} borderColor="amber" />
        <CompactStatCard label="Belum Bayar" value={`${summary?.unpaidCount ?? 0} data`} description={`${summary?.financialCount ?? 0} data keuangan`} borderColor="rose" />
      </section>

      <Panel
        title="Rekap pendaftaran"
        description={`${rows.length} data tampil dari update 2026/2027.`}
      >
        <CategoryTabs
          value={category}
          onChange={setCategory}
          items={enrollmentCategories.map((item) => ({
            value: item.value,
            label: item.label,
            count: item.value
              ? rows.filter((row) => row.category === item.value).length
              : rows.length,
          }))}
        />
        <CategoryTabs
          value={paymentStatus}
          onChange={setPaymentStatus}
          items={[
            { value: "", label: "Semua bayar", count: rows.length },
            ...enrollmentPaymentStatuses.map((status) => ({
              value: status,
              label: statusLabel(status),
              count: rows.filter((row) => row.paymentStatus === status).length,
            })),
          ]}
        />
        <CompactTable
          data={rows}
          rowKey={(row) => row.id}
          emptyText={
            query.isLoading
              ? "Memuat update pendaftaran."
              : "Belum ada data sesuai filter."
          }
          columns={[
            {
              key: "name",
              header: "Nama",
              render: (row) => (
                <div>
                  <p className="font-semibold text-[#0a1f5c]">{row.fullName}</p>
                  <p className="text-xs text-[#64748b]">
                    {[row.programLevel, row.address].filter(Boolean).join(" / ") || "-"}
                  </p>
                </div>
              ),
            },
            {
              key: "category",
              header: "Kategori",
              render: (row) => <StatusBadge value={row.category} />,
            },
            {
              key: "finance",
              header: "Keuangan",
              render: (row) =>
                row.isFinancial ? (
                  <div>
                    <p className="font-semibold text-[#0a1f5c]">
                      {formatMoney(row.paidAmount)}
                      {row.targetAmount ? ` / ${formatMoney(row.targetAmount)}` : ""}
                    </p>
                    <p className="text-xs text-[#64748b]">
                      Sisa {formatMoney(row.outstandingAmount)}
                    </p>
                  </div>
                ) : (
                  <span className="text-xs font-semibold text-[#64748b]">
                    Non-keuangan
                  </span>
                ),
            },
            {
              key: "status",
              header: "Status",
              render: (row) => (
                <div className="flex flex-wrap gap-1.5">
                  <StatusBadge value={row.paymentStatus} />
                  <StatusBadge value={row.confirmationStatus} />
                </div>
              ),
            },
            {
              key: "link",
              header: "Data existing",
              render: (row) => (
                <div className="text-xs font-semibold text-[#64748b]">
                  {row.student ? <p>Murid: {row.student.fullName}</p> : null}
                  {row.registration ? <p>PPDB: {row.registration.registrationNumber}</p> : null}
                  {!row.student && !row.registration ? <p>Belum cocok</p> : null}
                </div>
              ),
            },
            {
              key: "action",
              header: "Aksi",
              className: "w-[160px]",
              render: (row) => (
                <ActionGroup>
                  {can("manage_registrations") ? (
                    <>
                      <ActionButton
                        icon={<Pencil className="h-3.5 w-3.5" />}
                        onClick={() => openEdit(row)}
                      >
                        Update
                      </ActionButton>
                      <ActionButton
                        tone="danger"
                        icon={<Trash2 className="h-3.5 w-3.5" />}
                        onClick={() => {
                          if (window.confirm(`Hapus ${row.fullName}?`)) {
                            remove.mutate(row.id);
                          }
                        }}
                      >
                        Hapus
                      </ActionButton>
                    </>
                  ) : (
                    <span className="text-xs font-semibold text-[#64748b]">
                      Lihat saja
                    </span>
                  )}
                </ActionGroup>
              ),
            },
          ]}
        />
      </Panel>

      <DrawerForm
        open={formOpen}
        title={editing ? "Update data pendaftaran" : "Data pendaftaran baru"}
        description="Ubah nominal, status, dan catatan manual."
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
          className="grid gap-3"
        >
          <SelectField
            label="Kategori"
            value={form.category}
            required
            onChange={(value) => {
              const nextCategory = value as EnrollmentCategory;
              const isFinancial = isEnrollmentFinancial(nextCategory);
              setForm({
                ...form,
                category: nextCategory,
                paymentStatus: isFinancial
                  ? enrollmentPaymentStatus(form.targetAmount, form.paidAmount)
                  : "not_applicable",
                confirmationStatus: enrollmentConfirmationStatus(
                  nextCategory,
                  form.paidAmount,
                ),
              });
            }}
          >
            {enrollmentCategories
              .filter((item) => item.value)
              .map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
          </SelectField>
          <TextInput
            label="Nama"
            value={form.fullName}
            required
            onChange={(value) => setForm({ ...form, fullName: value })}
          />
          <SelectField
            label="Level"
            value={form.programLevel}
            onChange={(value) => setForm({ ...form, programLevel: value })}
          >
            <option value="">Belum diisi</option>
            {levelOptions.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </SelectField>
          <TextInput
            label="Alamat"
            value={form.address}
            onChange={(value) => setForm({ ...form, address: value })}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput
              label="Target biaya"
              type="number"
              value={form.targetAmount}
              onChange={(value) => setAmount("targetAmount", value)}
            />
            <TextInput
              label="Sudah dibayar"
              type="number"
              value={form.paidAmount}
              onChange={(value) => setAmount("paidAmount", value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label="Status bayar"
              value={form.paymentStatus}
              onChange={(value) =>
                setForm({ ...form, paymentStatus: value as EnrollmentPaymentStatus })
              }
            >
              {(isEnrollmentFinancial(form.category)
                ? enrollmentPaymentStatuses.filter(
                    (status) => status !== "not_applicable",
                  )
                : (["not_applicable"] as EnrollmentPaymentStatus[])
              ).map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Status konfirmasi"
              value={form.confirmationStatus}
              onChange={(value) =>
                setForm({
                  ...form,
                  confirmationStatus: value as EnrollmentConfirmationStatus,
                })
              }
            >
              {enrollmentConfirmationStatuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </SelectField>
          </div>
          <TextArea
            label="Catatan sumber"
            value={form.sourceText}
            rows={3}
            onChange={(value) => setForm({ ...form, sourceText: value })}
          />
          <TextArea
            label="Catatan admin"
            value={form.notes}
            rows={3}
            onChange={(value) => setForm({ ...form, notes: value })}
          />
          <SubmitButton pending={save.isPending}>Simpan update</SubmitButton>
        </form>
      </DrawerForm>
    </div>
  );
}

export function RegistrationsPage() {
  const queryClient = useQueryClient();
  const registrationsQuery = useList<Registration>(
    ["registrations"],
    "/registrations?perPage=100",
  );
  const classes = listFrom(
    useList<SchoolClass>(
      ["classes", "registration-options"],
      "/classes?perPage=100",
    ).data,
  );
  const registrations = listFrom(registrationsQuery.data);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [convertClassId, setConvertClassId] = useState("");
  const [nis, setNis] = useState("");
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const filteredRegistrations = registrations.filter((item) => {
    const keyword = search.trim().toLowerCase();
    if (
      keyword &&
      ![
        item.childName,
        item.registrationNumber,
        item.parentName,
        item.parentPhone ?? "",
        item.parentEmail ?? "",
        normalizeLevel(item.programApplied),
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    ) {
      return false;
    }
    if (!matchesLevel(item.programApplied, levelFilter)) return false;
    if (statusFilter && item.status !== statusFilter) return false;
    return true;
  });
  const selected =
    filteredRegistrations.find((item) => item.id === selectedId) ??
    filteredRegistrations[0] ??
    registrations[0];

  useEffect(() => {
    if (!selectedId && registrations.length > 0)
      setSelectedId(registrations[0].id);
  }, [registrations, selectedId]);

  useEffect(() => {
    setReviewerNotes(selected?.reviewerNotes ?? "");
  }, [selected?.id, selected?.reviewerNotes]);

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: RegistrationStatus }) =>
      apiFetch(`/registrations/${id}/status`, {
        method: "PUT",
        body: { status, reviewerNotes },
      }),
    onSuccess: () => {
      toast.success("Status PPDB diperbarui");
      queryClient.invalidateQueries({ queryKey: ["registrations"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const convert = useMutation({
    mutationFn: () =>
      apiFetch(`/registrations/${selected?.id}/convert`, {
        method: "POST",
        body: { classId: convertClassId, nis: nis || undefined },
      }),
    onSuccess: () => {
      toast.success("Pendaftaran menjadi murid");
      setNis("");
      queryClient.invalidateQueries({ queryKey: ["registrations"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteRegistration = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/registrations/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Pendaftaran dihapus");
      setDetailOpen(false);
      setSelectedId(null);
      queryClient.invalidateQueries({ queryKey: ["registrations"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="grid gap-4">
      <PageHeader
        icon={<BadgeCheck className="h-5 w-5" />}
        title="PPDB"
        description="Tinjau pendaftaran, cek dokumen, ubah status, lalu konversi calon murid yang diterima."
      >
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Cari calon murid, nomor, orang tua"
        />
      </PageHeader>

      <Panel
        title="Pipeline pendaftaran"
        description={`${filteredRegistrations.length} pendaftaran tampil.`}
      >
        <CategoryTabs
          value={levelFilter}
          onChange={setLevelFilter}
          items={levelTabs(registrations, (item) => item.programApplied)}
        />
        <CategoryTabs
          value={statusFilter}
          onChange={setStatusFilter}
          items={[
            {
              value: "",
              label: "Semua status",
              count: registrations.filter((item) =>
                matchesLevel(item.programApplied, levelFilter),
              ).length,
            },
            ...registrationStatuses.map((status) => ({
              value: status,
              label: statusLabel(status),
              count: registrations.filter(
                (item) =>
                  matchesLevel(item.programApplied, levelFilter) &&
                  item.status === status,
              ).length,
            })),
          ]}
        />
        <CompactTable
          data={filteredRegistrations}
          rowKey={(item) => item.id}
          emptyText={
            registrationsQuery.isLoading
              ? "Memuat pendaftaran."
              : "Tidak ada pendaftaran sesuai filter."
          }
          columns={[
            {
              key: "child",
              header: "Calon murid",
              render: (item) => (
                <div>
                  <p className="font-semibold text-[#0a1f5c]">
                    {item.childName}
                  </p>
                  <p className="text-xs text-[#64748b]">
                    {item.registrationNumber} /{" "}
                    {normalizeLevel(item.programApplied)}
                  </p>
                </div>
              ),
            },
            {
              key: "parent",
              header: "Orang tua",
              render: (item) => item.parentName,
            },
            {
              key: "phone",
              header: "Kontak",
              render: (item) => item.parentPhone ?? "-",
            },
            {
              key: "status",
              header: "Status",
              render: (item) => <StatusBadge value={item.status} />,
            },
            {
              key: "action",
              header: "Aksi",
              className: "w-[160px]",
              render: (item) => (
                <ActionGroup>
                  <ActionButton
                    onClick={() => {
                      setSelectedId(item.id);
                      setDetailOpen(true);
                    }}
                  >
                    Detail
                  </ActionButton>
                  <ActionButton
                    tone="danger"
                    icon={<Trash2 className="h-3.5 w-3.5" />}
                    onClick={() => {
                      if (
                        window.confirm(`Hapus pendaftaran ${item.childName}?`)
                      )
                        deleteRegistration.mutate(item.id);
                    }}
                  >
                    Hapus
                  </ActionButton>
                </ActionGroup>
              ),
            },
          ]}
        />
      </Panel>

      <DrawerForm
        open={detailOpen}
        title="Detail pendaftaran"
        description={
          selected ? selected.registrationNumber : "Pilih data dari pipeline."
        }
        onClose={() => setDetailOpen(false)}
      >
        {selected ? (
          <div className="grid gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-bold text-[#0a1f5c]">
                    {selected.childName}
                  </p>
                  <p className="text-xs text-[#64748b]">
                    {selected.programApplied ?? "-"} /{" "}
                    {formatDate(selected.childBirthDate)}
                  </p>
                </div>
                <StatusBadge value={selected.status} />
              </div>
              <div className="mt-3 grid gap-1.5 text-sm text-[#334155]">
                <p>
                  <span className="font-semibold text-[#0a1f5c]">
                    Orang tua:
                  </span>{" "}
                  {selected.parentName}
                </p>
                <p>
                  <span className="font-semibold text-[#0a1f5c]">Kontak:</span>{" "}
                  {selected.parentPhone ?? "-"} / {selected.parentEmail ?? "-"}
                </p>
                <p>
                  <span className="font-semibold text-[#0a1f5c]">Alamat:</span>{" "}
                  {selected.address ?? "-"}
                </p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase text-[#64748b]">
                Dokumen
              </p>
              <div className="grid gap-2">
                {(selected.documentUrls ?? []).map((doc, index) => (
                  <a
                    key={`${doc.url}-${index}`}
                    className="rounded-xl border border-slate-200 p-3 text-sm font-semibold text-[#123c8c]"
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {doc.name ?? `Dokumen ${index + 1}`}
                  </a>
                ))}
                {(selected.documentUrls ?? []).length === 0 ? (
                  <EmptyState text="Dokumen belum ada." />
                ) : null}
              </div>
            </div>

            <TextArea
              label="Catatan reviewer"
              value={reviewerNotes}
              rows={4}
              onChange={setReviewerNotes}
            />
            <div className="flex flex-wrap gap-1.5">
              {registrationStatuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() =>
                    updateStatus.mutate({ id: selected.id, status })
                  }
                  className="madani-button border border-slate-200 bg-white text-[#0a1f5c]"
                >
                  {statusLabel(status)}
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-slate-200 p-3">
              <p className="mb-3 text-xs font-bold uppercase text-[#64748b]">
                Konversi ke murid
              </p>
              <div className="grid gap-3">
                <SelectField
                  label="Kelas tujuan"
                  value={convertClassId}
                  required
                  onChange={setConvertClassId}
                >
                  <option value="">Pilih kelas</option>
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {classLabel(item)}
                    </option>
                  ))}
                </SelectField>
                <TextInput label="NIS" value={nis} onChange={setNis} />
                <button
                  type="button"
                  disabled={
                    !convertClassId || Boolean(selected.convertedStudentId)
                  }
                  onClick={() => convert.mutate()}
                  className="madani-button bg-[#0a1f5c] text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Check className="h-3.5 w-3.5" />
                  {selected.convertedStudentId
                    ? "Sudah jadi murid"
                    : "Jadikan murid"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState text="Belum ada pendaftaran." />
        )}
      </DrawerForm>
    </div>
  );
}

export function SettingsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");
  const tab: SettingsTabKey = settingsTabKeys.includes(
    sectionParam as SettingsTabKey,
  )
    ? (sectionParam as SettingsTabKey)
    : "years";
  const [settingsSection, setSettingsSection] = useState<"website" | "users" | "roles">("website");
  const [yearSearch, setYearSearch] = useState("");
  const settingsQuery = useList<SettingRow>(["settings"], "/settings");
  const yearsQuery = useList<AcademicYear>(
    ["academic-years", "settings"],
    "/academic-years",
  );
  const settings = listFrom(settingsQuery.data);
  const years = listFrom(yearsQuery.data);
  const [yearForm, setYearForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    isActive: false,
  });
  const [yearFormOpen, setYearFormOpen] = useState(false);
  const [editingYearId, setEditingYearId] = useState<number | null>(null);
  const [documents, setDocuments] = useState(
    "Akta\nKK\nPas foto\nKTP orang tua",
  );
  const [signature, setSignature] = useState({
    principalName: "Kepala Sekolah Madani",
    principalTitle: "Kepala Sekolah",
    signatureUrl: "",
  });
  const [siteSettings, setSiteSettings] = useState({
    headline: "PPDB Madani Montessori Islamic School",
    whatsapp: "",
    address: "",
    ppdbOpen: true,
    announcement: "",
  });
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (settings.length > 0) {
      setDocuments(
        settingValue(
          settings,
          "ppdb_required_documents",
          "Akta\nKK\nPas foto\nKTP orang tua",
        ),
      );
      setSignature({
        principalName: settingValue(
          settings,
          "principal_name",
          "Kepala Sekolah Madani",
        ),
        principalTitle: settingValue(
          settings,
          "principal_title",
          "Kepala Sekolah",
        ),
        signatureUrl: settingValue(settings, "principal_signature_url", ""),
      });
      setSiteSettings({
        headline: settingValue(settings, "website_headline", "PPDB Madani Montessori Islamic School"),
        whatsapp: settingValue(settings, "website_whatsapp", ""),
        address: settingValue(settings, "school_address", ""),
        ppdbOpen: settingValue(settings, "ppdb_online_enabled", "1") !== "0",
        announcement: settingValue(settings, "website_announcement", ""),
      });
    }
  }, [settings]);

  function resetYearForm() {
    setEditingYearId(null);
    setYearForm({ name: "", startDate: "", endDate: "", isActive: false });
  }

  function openCreateYear() {
    resetYearForm();
    setYearFormOpen(true);
  }

  function openEditYear(year: AcademicYear) {
    setEditingYearId(year.id);
    setYearForm({
      name: year.name,
      startDate: year.startDate?.slice(0, 10) ?? "",
      endDate: year.endDate?.slice(0, 10) ?? "",
      isActive: Boolean(year.isActive),
    });
    setYearFormOpen(true);
  }

  const createYear = useMutation({
    mutationFn: () =>
      apiFetch<AcademicYear>(
        editingYearId ? `/academic-years/${editingYearId}` : "/academic-years",
        { method: editingYearId ? "PUT" : "POST", body: yearForm },
      ),
    onSuccess: () => {
      toast.success("Tahun ajaran tersimpan");
      resetYearForm();
      setYearFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ["academic-years"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteYear = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/academic-years/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Tahun ajaran dihapus");
      queryClient.invalidateQueries({ queryKey: ["academic-years"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const activateYear = useMutation({
    mutationFn: (id: number) =>
      apiFetch<AcademicYear>(`/academic-years/${id}/activate`, {
        method: "PUT",
      }),
    onSuccess: () => {
      toast.success("Tahun ajaran aktif diperbarui");
      queryClient.invalidateQueries({ queryKey: ["academic-years"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const saveDocuments = useMutation({
    mutationFn: () =>
      apiFetch<SettingRow[]>("/settings", {
        method: "PUT",
        body: {
          settings: [
            {
              key: "ppdb_required_documents",
              value: documents
                .split("\n")
                .map((item) => item.trim())
                .filter(Boolean),
              type: "json",
            },
          ],
        },
      }),
    onSuccess: () => {
      toast.success("Dokumen PPDB tersimpan");
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const saveSignature = useMutation({
    mutationFn: () => {
      const data = new FormData();
      data.set("principalName", signature.principalName);
      data.set("principalTitle", signature.principalTitle);
      if (signature.signatureUrl)
        data.set("signatureUrl", signature.signatureUrl);
      if (file) data.set("signature", file);
      return apiFetch<SettingRow[]>("/settings/report-signature", {
        method: "POST",
        body: data,
      });
    },
    onSuccess: () => {
      toast.success("Tanda tangan tersimpan");
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const saveSiteSettings = useMutation({
    mutationFn: () =>
      apiFetch<SettingRow[]>("/settings", {
        method: "PUT",
        body: {
          settings: [
            { key: "website_headline", value: siteSettings.headline, type: "text" },
            { key: "website_whatsapp", value: siteSettings.whatsapp, type: "text" },
            { key: "school_address", value: siteSettings.address, type: "text" },
            { key: "ppdb_online_enabled", value: siteSettings.ppdbOpen ? "1" : "0", type: "boolean" },
            { key: "website_announcement", value: siteSettings.announcement, type: "text" },
          ],
        },
      }),
    onSuccess: () => {
      toast.success("Pengaturan website tersimpan");
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const requiredDocuments = documents
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
  const activeYear = years.find((year) => year.isActive);
  const filteredYears = years.filter((year) => {
    const keyword = yearSearch.trim().toLowerCase();
    if (!keyword) return true;
    return [year.name, year.isActive ? "aktif" : "nonaktif"]
      .join(" ")
      .toLowerCase()
      .includes(keyword);
  });
  const settingsTabs = [
    {
      key: "years",
      label: "Tahun Ajaran",
      detail: activeYear?.name ?? `${years.length} data tersimpan`,
    },
    {
      key: "documents",
      label: "Dokumen PPDB",
      detail: `${requiredDocuments.length} dokumen wajib`,
    },
    {
      key: "signature",
      label: "Tanda Tangan Raport",
      detail: signature.principalName || "Belum diisi",
    },
    {
      key: "site",
      label: "Info Website",
      detail: siteSettings.ppdbOpen ? "PPDB online aktif" : "PPDB online tutup",
    },
  ] as const;

  function selectTab(nextTab: SettingsTabKey) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextTab === "years") {
      params.delete("section");
    } else {
      params.set("section", nextTab);
    }
    const query = params.toString();
    router.replace(query ? `/settings?${query}` : "/settings", {
      scroll: false,
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-3 lg:sticky lg:top-20 lg:self-start">
        <div className="mb-3 flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-[#0a1f5c]">
            <Settings className="h-4 w-4" />
          </span>
          <div>
            <p className="text-base font-bold leading-none text-[#0a1f5c]">
              Pengaturan sekolah
            </p>
            <p className="mt-1 text-xs font-medium text-[#64748b]">
              Data dasar operasional.
            </p>
          </div>
        </div>
        <div className="mb-4 grid gap-1.5 border-b border-slate-100 pb-3">
          {[
            { key: "website", label: "Website", detail: "Data sekolah" },
            { key: "users", label: "Admin User", detail: "Akun internal" },
            { key: "roles", label: "Role Admin", detail: "Permission matrix" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setSettingsSection(item.key as "website" | "users" | "roles")}
              className={`rounded-xl border p-3 text-left transition ${
                settingsSection === item.key
                  ? "border-[#0a1f5c]/30 bg-[#0a1f5c]/5 text-[#0a1f5c]"
                  : "border-slate-200 bg-white text-[#0a1f5c] hover:border-[#0a1f5c]/30"
              }`}
            >
              <span className="block text-sm font-semibold">{item.label}</span>
              <span className="mt-1 block text-xs font-medium text-[#64748b]">
                {item.detail}
              </span>
            </button>
          ))}
        </div>
        <div className={settingsSection === "website" ? "grid gap-1.5" : "hidden"}>
          {settingsTabs.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => selectTab(item.key)}
              className={`rounded-xl border p-3 text-left transition ${
                tab === item.key
                  ? "border-[#0a1f5c] bg-[#0a1f5c] text-white"
                  : "border-slate-200 bg-white text-[#0a1f5c] hover:border-[#0a1f5c]/30"
              }`}
            >
              <span className="block text-sm font-semibold">{item.label}</span>
              <span
                className={`mt-1 block text-xs font-medium ${tab === item.key ? "text-white/70" : "text-[#64748b]"}`}
              >
                {item.detail}
              </span>
            </button>
          ))}
        </div>
      </aside>

      <div className="grid gap-4">
        {settingsSection === "users" ? <UsersPage /> : null}
        {settingsSection === "roles" ? <RolesSettingsPage /> : null}
        <div className={settingsSection === "website" ? "grid gap-4" : "hidden"}>
        <DrawerForm
          open={yearFormOpen}
          title={editingYearId ? "Edit tahun ajaran" : "Tambah tahun ajaran"}
          description="Periode belajar sekolah."
          onClose={() => {
            setYearFormOpen(false);
            resetYearForm();
          }}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              createYear.mutate();
            }}
            className="grid gap-3"
          >
            <TextInput
              label="Nama tahun ajaran"
              value={yearForm.name}
              required
              onChange={(value) => setYearForm({ ...yearForm, name: value })}
            />
            <TextInput
              label="Tanggal mulai tahun ajaran baru"
              type="date"
              value={yearForm.startDate}
              required
              onChange={(value) =>
                setYearForm({ ...yearForm, startDate: value })
              }
            />
            <TextInput
              label="Tanggal berakhir tahun ajaran baru"
              type="date"
              value={yearForm.endDate}
              required
              onChange={(value) => setYearForm({ ...yearForm, endDate: value })}
            />
            <label className="flex items-center gap-3 text-xs font-semibold text-[#0a1f5c]">
              <input
                type="checkbox"
                checked={yearForm.isActive}
                onChange={(event) =>
                  setYearForm({ ...yearForm, isActive: event.target.checked })
                }
              />
              Jadikan aktif
            </label>
            <SubmitButton pending={createYear.isPending}>
              Simpan tahun ajaran
            </SubmitButton>
          </form>
        </DrawerForm>

        {tab === "years" ? (
          <Panel
            title="Tahun ajaran"
            description={`${filteredYears.length} tahun ajaran tampil. Sistem memilih tahun ajaran dari tanggal hari ini; Mei 2026 masuk 2025/2026, setelah tanggal mulai akhir Juni masuk 2026/2027.`}
            action={
              <button
                type="button"
                onClick={openCreateYear}
                className="madani-button bg-[#0a1f5c] text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah tahun
              </button>
            }
          >
            <div className="mb-3">
              <SearchField
                value={yearSearch}
                onChange={setYearSearch}
                placeholder="Cari tahun ajaran"
              />
            </div>
            <CompactTable
              data={filteredYears}
              rowKey={(year) => year.id}
              emptyText={
                yearsQuery.isLoading
                  ? "Memuat tahun ajaran."
                  : "Tidak ada tahun ajaran sesuai pencarian."
              }
              columns={[
                {
                  key: "name",
                  header: "Tahun ajaran",
                  render: (year) => (
                    <span className="font-semibold text-[#0a1f5c]">
                      {year.name}
                    </span>
                  ),
                },
                {
                  key: "period",
                  header: "Periode",
                  render: (year) =>
                    `${formatDate(year.startDate)} - ${formatDate(year.endDate)}`,
                },
                {
                  key: "status",
                  header: "Status",
                  render: (year) =>
                    year.isActive ? (
                      <StatusBadge value="active" />
                    ) : (
                      <StatusBadge value="inactive" />
                    ),
                },
                {
                  key: "action",
                  header: "Aksi",
                  className: "w-[230px]",
                  render: (year) => (
                    <ActionGroup>
                      <ActionButton
                        icon={<Pencil className="h-3.5 w-3.5" />}
                        onClick={() => openEditYear(year)}
                      >
                        Edit
                      </ActionButton>
                      {!year.isActive ? (
                        <ActionButton
                          tone="primary"
                          onClick={() => activateYear.mutate(year.id)}
                        >
                          Aktifkan
                        </ActionButton>
                      ) : null}
                      <ActionButton
                        tone="danger"
                        icon={<Trash2 className="h-3.5 w-3.5" />}
                        disabled={Boolean(year.isActive)}
                        onClick={() => {
                          if (
                            window.confirm(`Hapus tahun ajaran ${year.name}?`)
                          )
                            deleteYear.mutate(year.id);
                        }}
                      >
                        Hapus
                      </ActionButton>
                    </ActionGroup>
                  ),
                },
              ]}
            />
          </Panel>
        ) : null}

        {tab === "documents" ? (
          <Panel
            title="Dokumen PPDB"
            description="Daftar ini muncul sebagai syarat pendaftaran online."
          >
            <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  saveDocuments.mutate();
                }}
                className="grid gap-3"
              >
                <TextArea
                  label="Dokumen wajib PPDB"
                  value={documents}
                  rows={9}
                  onChange={setDocuments}
                />
                <p className="text-xs font-semibold text-[#64748b]">
                  Satu baris untuk satu dokumen.
                </p>
                <SubmitButton pending={saveDocuments.isPending}>
                  Simpan dokumen
                </SubmitButton>
              </form>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="mb-3 text-xs font-bold uppercase text-[#64748b]">
                  Preview syarat
                </p>
                <div className="grid gap-1.5">
                  {requiredDocuments.map((document) => (
                    <div
                      key={document}
                      className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-medium text-[#334155]"
                    >
                      <Check className="h-4 w-4 text-emerald-600" />
                      {document}
                    </div>
                  ))}
                  {requiredDocuments.length === 0 ? (
                    <EmptyState text="Belum ada dokumen wajib." />
                  ) : null}
                </div>
              </div>
            </section>
          </Panel>
        ) : null}

        {tab === "signature" ? (
          <Panel
            title="Tanda tangan raport"
            description="Dipakai untuk PDF raport yang dipublish sekolah."
          >
            <section className="grid gap-4 xl:grid-cols-[0.86fr_1.14fr]">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  saveSignature.mutate();
                }}
                className="grid gap-3"
              >
                <TextInput
                  label="Nama kepala sekolah"
                  value={signature.principalName}
                  required
                  onChange={(value) =>
                    setSignature({ ...signature, principalName: value })
                  }
                />
                <TextInput
                  label="Jabatan"
                  value={signature.principalTitle}
                  required
                  onChange={(value) =>
                    setSignature({ ...signature, principalTitle: value })
                  }
                />
                <FileField
                  label="Gambar tanda tangan"
                  files={file ? [file] : []}
                  accept="image/png,image/jpeg"
                  onChange={(files) => setFile(files[0] ?? null)}
                />
                <TextInput
                  label="URL gambar tanda tangan"
                  value={signature.signatureUrl}
                  onChange={(value) =>
                    setSignature({ ...signature, signatureUrl: value })
                  }
                />
                <SubmitButton pending={saveSignature.isPending}>
                  Simpan tanda tangan
                </SubmitButton>
              </form>
              <div className="grid content-start gap-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-bold uppercase text-[#64748b]">
                    Tampil di PDF
                  </p>
                  <p className="mt-3 text-base font-bold text-[#0a1f5c]">
                    {signature.principalName}
                  </p>
                  <p className="text-sm font-medium text-[#64748b]">
                    {signature.principalTitle}
                  </p>
                  <div className="mt-4 h-16 rounded-xl border border-dashed border-slate-200 bg-slate-50" />
                </div>
                <p className="rounded-xl bg-amber-50 p-3 text-xs font-medium leading-5 text-amber-800">
                  Tanda tangan ini visual untuk PDF raport, bukan TTE
                  tersertifikasi PSrE.
                </p>
              </div>
            </section>
          </Panel>
        ) : null}

        {tab === "site" ? (
          <Panel
            title="Info website"
            description="Kontrol konten singkat yang dipakai website publik dan alur PPDB."
          >
            <form
              onSubmit={(event) => {
                event.preventDefault();
                saveSiteSettings.mutate();
              }}
              className="grid gap-3 xl:grid-cols-2"
            >
              <TextInput
                label="Judul PPDB / website"
                value={siteSettings.headline}
                onChange={(value) => setSiteSettings({ ...siteSettings, headline: value })}
              />
              <TextInput
                label="Nomor WhatsApp admin"
                value={siteSettings.whatsapp}
                placeholder="62812..."
                onChange={(value) => setSiteSettings({ ...siteSettings, whatsapp: value })}
              />
              <div className="xl:col-span-2">
                <TextArea
                  label="Alamat sekolah"
                  value={siteSettings.address}
                  rows={3}
                  onChange={(value) => setSiteSettings({ ...siteSettings, address: value })}
                />
              </div>
              <div className="xl:col-span-2">
                <TextArea
                  label="Pengumuman website"
                  value={siteSettings.announcement}
                  rows={4}
                  placeholder="Contoh: PPDB gelombang 1 dibuka sampai 30 Juni."
                  onChange={(value) => setSiteSettings({ ...siteSettings, announcement: value })}
                />
              </div>
              <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-[#0a1f5c]">
                <input
                  type="checkbox"
                  checked={siteSettings.ppdbOpen}
                  onChange={(event) => setSiteSettings({ ...siteSettings, ppdbOpen: event.target.checked })}
                />
                Form PPDB online aktif
              </label>
              <div className="xl:col-span-2">
                <SubmitButton pending={saveSiteSettings.isPending}>
                  Simpan pengaturan website
                </SubmitButton>
              </div>
            </form>
          </Panel>
        ) : null}
        </div>
      </div>
    </div>
  );
}

export function UsersPage() {
  const queryClient = useQueryClient();
  const usersQuery = useList<User>(["users"], "/users?perPage=100");
  const users = listFrom(usersQuery.data);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "guru",
    isActive: true,
  });

  const filteredUsers = users.filter((user) => {
    const roles = roleNames(user);
    const keyword = search.trim().toLowerCase();
    if (
      keyword &&
      ![user.name, user.email, user.phone ?? "", roles.map(roleLabel).join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    ) {
      return false;
    }
    if (role && !roles.includes(role)) return false;
    if (status === "active" && user.isActive === false) return false;
    if (status === "inactive" && user.isActive !== false) return false;
    return true;
  });

  function resetForm() {
    setEditingUserId(null);
    setForm({
      name: "",
      email: "",
      phone: "",
      password: "",
      role: "guru",
      isActive: true,
    });
  }

  function openCreate() {
    resetForm();
    setFormOpen(true);
  }

  function openEdit(user: User) {
    setEditingUserId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone ?? "",
      password: "",
      role: roleNames(user)[0] ?? "guru",
      isActive: user.isActive !== false,
    });
    setFormOpen(true);
  }

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        role: form.role,
        password: form.password || undefined,
        isActive: form.isActive,
      };

      return editingUserId
        ? apiFetch<User>(`/users/${editingUserId}`, { method: "PUT", body })
        : apiFetch<User>("/users", { method: "POST", body });
    },
    onSuccess: () => {
      toast.success("Pengguna tersimpan");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setFormOpen(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const toggle = useMutation({
    mutationFn: (id: number) =>
      apiFetch<User>(`/users/${id}/toggle-active`, { method: "PUT" }),
    onSuccess: () => {
      toast.success("Status pengguna diperbarui");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: number) => apiFetch(`/users/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Pengguna dihapus");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => toast.error(error.message),
  });

  function copyEmail(email: string) {
    navigator.clipboard?.writeText(email).then(
      () => toast.success("Email disalin"),
      () => toast.error("Email gagal disalin"),
    );
  }

  return (
    <div className="grid gap-4">
      <Breadcrumbs
        items={[
          { label: "Pengaturan", href: "/settings" },
          { label: "Admin User" },
        ]}
      />
      <PageHeader
        icon={<UserRoundCog className="h-5 w-5" />}
        title="Admin User"
        description="Kelola akses super admin, kepala sekolah, admin, guru, dan orang tua."
      >
        <div className="flex w-full flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Cari nama, email, role"
          />
        </div>
      </PageHeader>

      <DrawerForm
        open={formOpen}
        title={editingUserId ? "Edit akun" : "Akun baru"}
        description={
          editingUserId
            ? "Kosongkan password bila tidak diganti."
            : "Password minimal 8 karakter."
        }
        onClose={() => {
          setFormOpen(false);
          resetForm();
        }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
          className="grid gap-3"
        >
          <TextInput
            label="Nama"
            value={form.name}
            required
            onChange={(value) => setForm({ ...form, name: value })}
          />
          <TextInput
            label="Email"
            type="email"
            value={form.email}
            required
            onChange={(value) => setForm({ ...form, email: value })}
          />
          <TextInput
            label="No. HP"
            value={form.phone}
            onChange={(value) => setForm({ ...form, phone: value })}
          />
          <TextInput
            label="Password"
            type="password"
            value={form.password}
            required={!editingUserId}
            onChange={(value) => setForm({ ...form, password: value })}
          />
          <SelectField
            label="Role"
            value={form.role}
            required
            onChange={(value) => setForm({ ...form, role: value })}
          >
            <option value="super_admin">Super Admin</option>
            <option value="kepala_sekolah">Kepala Sekolah</option>
            <option value="admin">Admin</option>
            <option value="guru">Guru/Wali Kelas</option>
            <option value="orang_tua">Orang Tua</option>
          </SelectField>
          <label className="flex items-center gap-3 text-xs font-semibold text-[#0a1f5c]">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) =>
                setForm({ ...form, isActive: event.target.checked })
              }
            />
            Akun aktif
          </label>
          <SubmitButton pending={save.isPending}>Simpan akun</SubmitButton>
        </form>
      </DrawerForm>

      <Panel
        title="Daftar pengguna"
        description={`${filteredUsers.length} akun tampil.`}
        action={
          <button
            type="button"
            onClick={openCreate}
            className="madani-button bg-[#0a1f5c] text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            Akun baru
          </button>
        }
      >
        <CategoryTabs
          value={role}
          onChange={setRole}
          items={[
            { value: "", label: "Semua", count: users.length },
            {
              value: "super_admin",
              label: "Super Admin",
              count: users.filter((user) =>
                roleNames(user).includes("super_admin"),
              ).length,
            },
            {
              value: "kepala_sekolah",
              label: "Kepala Sekolah",
              count: users.filter((user) =>
                roleNames(user).includes("kepala_sekolah"),
              ).length,
            },
            {
              value: "admin",
              label: "Admin",
              count: users.filter((user) => roleNames(user).includes("admin"))
                .length,
            },
            {
              value: "guru",
              label: "Guru",
              count: users.filter((user) => roleNames(user).includes("guru"))
                .length,
            },
            {
              value: "orang_tua",
              label: "Orang Tua",
              count: users.filter((user) =>
                roleNames(user).includes("orang_tua"),
              ).length,
            },
          ]}
        />
        <CategoryTabs
          value={status}
          onChange={setStatus}
          items={[
            {
              value: "",
              label: "Semua status",
              count: users.filter(
                (user) => !role || roleNames(user).includes(role),
              ).length,
            },
            {
              value: "active",
              label: "Aktif",
              count: users.filter(
                (user) =>
                  (!role || roleNames(user).includes(role)) &&
                  user.isActive !== false,
              ).length,
            },
            {
              value: "inactive",
              label: "Nonaktif",
              count: users.filter(
                (user) =>
                  (!role || roleNames(user).includes(role)) &&
                  user.isActive === false,
              ).length,
            },
          ]}
        />
        <CompactTable
          data={filteredUsers}
          rowKey={(user) => user.id}
          emptyText={
            usersQuery.isLoading
              ? "Memuat pengguna."
              : "Tidak ada pengguna sesuai filter."
          }
          columns={[
            {
              key: "name",
              header: "Nama",
              render: (user) => (
                <div>
                  <p className="font-semibold text-[#0a1f5c]">{user.name}</p>
                  <p className="text-xs text-[#64748b]">
                    {user.email}
                    {user.phone ? ` / ${user.phone}` : ""}
                  </p>
                </div>
              ),
            },
            {
              key: "role",
              header: "Role",
              className: "min-w-[180px]",
              render: (user) =>
                roleNames(user).map(roleLabel).join(", ") || "Role belum ada",
            },
            {
              key: "status",
              header: "Status",
              className: "w-[120px]",
              render: (user) => (
                <StatusBadge
                  value={user.isActive === false ? "inactive" : "active"}
                />
              ),
            },
            {
              key: "actions",
              header: "Aksi",
              className: "w-[280px]",
              render: (user) => (
                <ActionGroup>
                  <ActionButton
                    icon={<Copy className="h-3.5 w-3.5" />}
                    onClick={() => copyEmail(user.email)}
                  >
                    Salin email
                  </ActionButton>
                  <ActionButton
                    icon={<Pencil className="h-3.5 w-3.5" />}
                    onClick={() => openEdit(user)}
                  >
                    Edit
                  </ActionButton>
                  <ActionButton
                    tone="primary"
                    icon={
                      user.isActive === false ? (
                        <UserCheck className="h-3.5 w-3.5" />
                      ) : (
                        <UserX className="h-3.5 w-3.5" />
                      )
                    }
                    onClick={() => toggle.mutate(user.id)}
                  >
                    {user.isActive === false ? "Aktifkan" : "Nonaktifkan"}
                  </ActionButton>
                  <ActionButton
                    tone="danger"
                    icon={<Trash2 className="h-3.5 w-3.5" />}
                    onClick={() => {
                      if (window.confirm(`Hapus pengguna ${user.name}?`))
                        remove.mutate(user.id);
                    }}
                  >
                    Hapus
                  </ActionButton>
                </ActionGroup>
              ),
            },
          ]}
        />
      </Panel>
    </div>
  );
}
