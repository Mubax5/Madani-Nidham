"use client";

/* eslint-disable @next/next/no-img-element */

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronRight, Search, X } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";
import { apiFetch, ApiResponse } from "@/lib/api";
import { formatRupiah } from "@/lib/format-currency";

export type User = { id: number; name: string; email?: string; roles?: string[] };
export type Student = { id: number; fullName: string; nickname?: string | null; nis?: string | null; photoUrl?: string | null; classes?: SchoolClass[] };
export type SchoolClass = { id: number; name: string; level: string; teacher?: User | null; studentsCount?: number };
export type MontessoriArea = { id: number; name: string };
export type HafalanSurah = {
  id: number;
  surahNumber: number;
  nameArabic: string;
  nameLatin: string;
  nameId: string;
  totalAyat: number;
  targetLevel?: string | null;
  studentStatus?: HafalanStatus;
  lastAyatReached?: number | null;
  notes?: string | null;
};
export type DoaItem = {
  id: number;
  name: string;
  arabicText: string;
  latinText: string;
  meaning: string;
  category: string;
  studentStatus?: DoaStatus;
};
export type HafalanStatus = "belum" | "sedang_dihafal" | "lancar" | "mutqin";
export type DoaStatus = "belum" | "sedang_dipelajari" | "hafal";
export type AbsenceRequest = {
  id: number;
  date: string;
  type: "sakit" | "izin";
  reason: string;
  status: string;
  documentUrl?: string | null;
  reviewerNotes?: string | null;
  student?: Student | null;
  requester?: User | null;
};
export type Portfolio = {
  id: number;
  title: string;
  description?: string | null;
  photoUrls: string[];
  workDate: string;
  isFeatured: boolean;
  student?: Student | null;
  class?: SchoolClass | null;
  area?: MontessoriArea | null;
};
export type Gallery = {
  id: number;
  eventName: string;
  description?: string | null;
  photoUrls: string[];
  eventDate: string;
  isPublished: boolean;
  class?: SchoolClass | null;
};
export type Article = {
  id: number;
  title: string;
  content: string;
  category: string;
  coverImageUrl?: string | null;
  relevantLevels?: string[];
  isPublished: boolean;
  publishedAt?: string | null;
};
export type BankAccount = { id: number; bankName: string; accountNumber: string; accountHolder: string; isActive: boolean };
export type FeeType = { id: number; name: string; amount: number; dueDay: number; applicableLevels?: string[]; isRecurring: boolean; isActive: boolean };
export type FeePayment = {
  id: number;
  receivedAmount: number;
  confirmedAmount?: number | null;
  proofUrl?: string | null;
  status: string;
  payerNotes?: string | null;
  adminNotes?: string | null;
  confirmedAt?: string | null;
  rejectedAt?: string | null;
  bankAccount?: BankAccount | null;
  uploader?: User | null;
  confirmer?: User | null;
};
export type StudentFee = {
  id: number;
  invoiceNumber?: string | null;
  month: number;
  year: number;
  dueDate?: string | null;
  issuedAt?: string | null;
  amount: number;
  discount: number;
  uniqueCode: number;
  totalBilled: number;
  paidAmount: number;
  status: string;
  paymentProofUrl?: string | null;
  paymentHistory?: Array<Record<string, unknown>>;
  paidAt?: string | null;
  student?: Student | null;
  feeType?: FeeType | null;
  bankAccount?: BankAccount | null;
  payments?: FeePayment[];
};
export type FinanceCategorySummary = { key: string; label: string; type: "income" | "expense"; target: number; paid: number; outstanding: number; count: number };
export type FinanceEntry = {
  id: number;
  type: "income" | "expense";
  category: string;
  title: string;
  amount: number;
  entryDate: string;
  source?: string | null;
  notes?: string | null;
};
export type TeacherPayroll = {
  id: number;
  teacherId?: number;
  teacher?: User | null;
  month: number;
  year: number;
  baseSalary: number;
  incentiveAmount: number;
  deductionAmount: number;
  totalAmount: number;
  status: "draft" | "approved" | "paid" | "cancelled";
  paidAt?: string | null;
  notes?: string | null;
};
export type FinanceOverview = {
  moduleName?: string;
  month: number;
  year: number;
  cashIn: number;
  cashOut: number;
  netCash: number;
  targetIncome: number;
  outstandingIncome: number;
  plannedExpense: number;
  categories: FinanceCategorySummary[];
  cashFlow: Record<"threeMonths" | "oneMonth" | "sevenDays" | "oneDay", Array<{ key: string; label: string; time?: number | null; cashIn: number; cashOut: number; netCash: number }>>;
  recentEntries: FinanceEntry[];
  payrolls: TeacherPayroll[];
};
export type TutoringSession = {
  id: number;
  type: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  sessionNotes?: string | null;
  homeworkNotes?: string | null;
  student?: Student | null;
  teacher?: User | null;
};
export type TutoringBooking = {
  id: number;
  type: string;
  preferredAt: string;
  notes?: string | null;
  status: string;
  student?: Student | null;
  teacher?: User | null;
  requester?: User | null;
};
export type AiHistory = { id: number; role: "user" | "model"; message: string; tokensUsed?: number | null; createdAt?: string; user?: User | null; student?: Student | null };
export type AiUsage = {
  global: { dailyRequests: number; tokensPerMinute: number };
  totals: { requests: number; tokens: number; activeAiUsers: number };
  users: Array<{ user: User; quota: { dailyRequestLimit: number; tokensPerMinuteLimit: number; weight: number; parentUserCount?: number; parentDailyRequestLimit?: number }; requestsToday: number; tokensToday: number; remainingRequests: number }>;
};
export type RolePermission = { id: number; name: string };
export type RoleMatrix = { id: number; name: string; permissions: RolePermission[] };

export const emptyList: unknown[] = [];
export const levels = ["KB", "TK A", "TK B", "TK C"];
export const compactLevels = ["KB", "TKA", "TKB", "TKC"];
export const statusColors: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
  unpaid: "bg-rose-50 text-rose-700 border-rose-200",
  partial: "bg-amber-50 text-amber-700 border-amber-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  draft: "bg-slate-50 text-slate-700 border-slate-200",
  mutqin: "bg-emerald-100 text-emerald-900 border-emerald-300",
  lancar: "bg-emerald-50 text-emerald-700 border-emerald-200",
  sedang_dihafal: "bg-amber-50 text-amber-700 border-amber-200",
  belum: "bg-slate-50 text-slate-600 border-slate-200",
};
export const pieColors = ["#0a1f5c", "#f5c542", "#10b981", "#ef4444", "#8b5cf6"];

export function listFrom<T>(response?: ApiResponse<T[]>): T[] {
  return Array.isArray(response?.data) ? response.data : (emptyList as T[]);
}

export function useList<T>(key: unknown[], endpoint: string, enabled = true) {
  return useQuery({ queryKey: key, queryFn: () => apiFetch<T[]>(endpoint), enabled, retry: false, staleTime: 5 * 60 * 1000, placeholderData: keepPreviousData });
}

export function useItem<T>(key: unknown[], endpoint: string, enabled = true) {
  return useQuery({ queryKey: key, queryFn: () => apiFetch<T>(endpoint), enabled, retry: false, staleTime: 5 * 60 * 1000, placeholderData: keepPreviousData });
}

export function buildQuery(path: string, params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") search.set(key, String(value));
  });
  return search.toString() ? `${path}?${search}` : path;
}

export function todayInput() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

export function monthName(month?: number, year?: number) {
  if (!month || !year) return "-";
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
}

export function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function money(value?: number | null) {
  return `Rp ${Number(value ?? 0).toLocaleString("id-ID")}`;
}

export function compactMoney(value?: number | null) {
  return formatRupiah(Number(value ?? 0), true);
}

export function lines(value: string) {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

export function appendFormValue(formData: FormData, key: string, value: string | number | boolean | undefined | null) {
  if (value === undefined || value === null || value === "") return;
  formData.append(key, String(value));
}

export function appendArray(formData: FormData, key: string, values: string[]) {
  values.forEach((value) => formData.append(`${key}[]`, value));
}

export function PageHeader({ children }: { title: string; description: string; icon: ReactNode; children?: ReactNode }) {
  if (!children) return null;

  return (
    <section className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-2.5 lg:flex-row lg:items-center lg:justify-between">
      {children}
    </section>
  );
}

export function Breadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 flex-wrap items-center gap-1 text-xs font-semibold text-[#64748b]">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="inline-flex min-w-0 items-center gap-1">
          {index > 0 ? <ChevronRight className="h-3.5 w-3.5 text-slate-400" /> : null}
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

export function Panel({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="flex min-h-11 items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
        <h2 className="text-[13px] font-bold text-[#0a1f5c]">{title}</h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Badge({ value }: { value?: string | null }) {
  return <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10.5px] font-bold ${statusColors[value ?? ""] ?? "bg-slate-50 text-slate-700 border-slate-200"}`}>{label(value)}</span>;
}

export function label(value?: string | null) {
  const labels: Record<string, string> = {
    sedang_dihafal: "Sedang",
    mutqin: "Mutqin",
    lancar: "Lancar",
    belum: "Belum",
    sedang_dipelajari: "Sedang",
    hafal: "Hafal",
    pending: "Pending",
    confirmed: "Terkonfirmasi",
    approved: "Disetujui",
    rejected: "Ditolak",
    unpaid: "Belum bayar",
    partial: "Sebagian",
    paid: "Lunas",
    scheduled: "Terjadwal",
    completed: "Selesai",
    cancelled: "Batal",
    rescheduled: "Reschedule",
    draft: "Draft",
    income: "Pemasukan",
    expense: "Pengeluaran",
    operational: "Operasional",
    donation: "Donasi",
    asset: "Aset",
    maintenance: "Maintenance",
    other: "Lainnya",
    calistung: "Calistung",
    pendampingan_belajar: "Pendampingan",
    bahasa: "Bahasa",
    TKA: "TK A",
    TKB: "TK B",
    TKC: "TK C",
  };
  return labels[value ?? ""] ?? value ?? "-";
}

export function Input({ label: inputLabel, value, onChange, type = "text", required, max }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; max?: string }) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold text-[#0a1f5c]">
      {inputLabel}
      <input className="madani-input" type={type} required={required} max={max} value={value} onChange={(event) => onChange(event.target.value)} suppressHydrationWarning />
    </label>
  );
}

export function Textarea({ label: inputLabel, value, onChange, rows = 4, required }: { label: string; value: string; onChange: (value: string) => void; rows?: number; required?: boolean }) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold text-[#0a1f5c]">
      {inputLabel}
      <textarea className="madani-input min-h-[96px]" rows={rows} required={required} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export function FileInput({ label: inputLabel, files, onChange, multiple = false, accept = "image/*,.pdf" }: { label: string; files: File[]; onChange: (files: File[]) => void; multiple?: boolean; accept?: string }) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold text-[#0a1f5c]">
      {inputLabel}
      <span className="flex min-h-9 cursor-pointer items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-[#64748b] hover:border-[#0a1f5c]/30">
        <span className="inline-flex rounded-lg bg-[#0a1f5c] px-2.5 py-1 text-white">Pilih file</span>
        <span className="min-w-0 truncate">{files.length ? `${files.length} file dipilih` : "Upload file atau isi URL"}</span>
      </span>
      <input className="sr-only" type="file" accept={accept} multiple={multiple} onChange={(event) => onChange(Array.from(event.target.files ?? []))} />
    </label>
  );
}

export function Select({ label: inputLabel, value, onChange, children, required }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode; required?: boolean }) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold text-[#0a1f5c]">
      {inputLabel}
      <select className="madani-input" required={required} value={value} onChange={(event) => onChange(event.target.value)} suppressHydrationWarning>
        {children}
      </select>
    </label>
  );
}

export function Button({ children, onClick, tone = "primary", disabled, type = "button" }: { children: ReactNode; onClick?: () => void; tone?: "primary" | "plain" | "danger"; disabled?: boolean; type?: "button" | "submit" }) {
  const cls = tone === "danger"
    ? "border-rose-200 bg-rose-50 text-rose-700"
    : tone === "plain"
      ? "border-slate-200 bg-white text-[#0a1f5c]"
      : "border-[#0a1f5c] bg-[#0a1f5c] text-white";
  return <button type={type} disabled={disabled} onClick={onClick} className={`madani-button border ${cls} disabled:cursor-not-allowed disabled:opacity-50`}>{children}</button>;
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="relative block min-w-[220px]">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]" />
      <input className="madani-input w-full" style={{ paddingLeft: 38 }} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

export function studentClass(student?: Student | null) {
  return student?.classes?.[0]?.name ?? "Belum ada kelas";
}

export function initials(value?: string | null) {
  return (value ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase())
    .join("") || "M";
}

export function Modal({ open, title, description, children, onClose }: { open: boolean; title: string; description?: string; children: ReactNode; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-y-0 left-0 right-0 z-50 grid place-items-center p-3 lg:left-[var(--madani-sidebar-offset,0px)]">
      <button type="button" aria-label="Tutup popup" className="absolute inset-0 bg-[#071744]/58 backdrop-blur-[1px]" onClick={onClose} />
      <section role="dialog" aria-modal="true" className="relative z-10 flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-lg bg-white shadow-[0_18px_54px_rgba(10,31,92,0.20)]">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="text-base font-bold text-[#0a1f5c]">{title}</h2>
            {description ? <p className="mt-1 text-xs leading-5 text-[#64748b]">{description}</p> : null}
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 text-[#64748b] hover:bg-slate-50">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </section>
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-xs font-medium text-[#64748b]">{text}</div>;
}

export function PhotoStrip({ urls, dense = false }: { urls?: string[]; dense?: boolean }) {
  const items = urls ?? [];
  if (items.length === 0) return <div className="grid aspect-[4/3] place-items-center rounded-lg bg-slate-100 text-xs font-semibold text-[#64748b]">Belum ada foto</div>;
  return (
    <div className={`grid gap-2 ${dense ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" : "grid-cols-2"}`}>
      {items.slice(0, dense ? 12 : 4).map((url, index) => (
        <a key={`${url}-${index}`} href={url} target="_blank" className="block overflow-hidden rounded-lg border border-slate-200" rel="noreferrer">
          <img src={url} alt="" className={`${dense ? "aspect-square" : "aspect-[4/3]"} w-full object-cover`} />
        </a>
      ))}
    </div>
  );
}

export function StudentOptions({ students }: { students: Student[] }) {
  return (
    <>
      <option value="">Pilih murid</option>
      {students.map((student) => <option key={student.id} value={student.id}>{student.fullName}</option>)}
    </>
  );
}

export function ClassOptions({ classes }: { classes: SchoolClass[] }) {
  return (
    <>
      <option value="">Pilih kelas</option>
      {classes.map((item) => <option key={item.id} value={item.id}>{item.name} / {item.level}</option>)}
    </>
  );
}
