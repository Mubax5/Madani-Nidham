"use client";

/* eslint-disable @next/next/no-img-element */

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Banknote,
  CalendarCheck,
  Check,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  Moon,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch, ApiResponse } from "@/lib/api";
import { formatRupiah } from "@/lib/format-currency";
import { usePermissions } from "@/lib/use-permissions";
import { CompactStatCard } from "@/components/finance/compact-stat-card";
import { MonthYearNav } from "@/components/finance/month-year-nav";
import { StudentPhotoFrame } from "@/components/student-photo-frame";

type User = { id: number; name: string; email?: string; roles?: string[] };
type Student = { id: number; fullName: string; nickname?: string | null; nis?: string | null; gender?: string | null; photoUrl?: string | null; programType?: string | null; programLabel?: string | null; classes?: SchoolClass[] };
type SchoolClass = { id: number; name: string; level: string; teacher?: User | null; studentsCount?: number };
type MontessoriArea = { id: number; name: string };
type HafalanSurah = {
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
type DoaItem = {
  id: number;
  name: string;
  arabicText: string;
  latinText: string;
  meaning: string;
  category: string;
  studentStatus?: DoaStatus;
};
type HafalanStatus = "belum" | "sedang_dihafal" | "lancar" | "mutqin";
type DoaStatus = "belum" | "sedang_dipelajari" | "hafal";
type AbsenceRequest = {
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
type Portfolio = {
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
type Gallery = {
  id: number;
  eventName: string;
  description?: string | null;
  photoUrls: string[];
  eventDate: string;
  isPublished: boolean;
  class?: SchoolClass | null;
};
type Article = {
  id: number;
  title: string;
  content: string;
  category: string;
  coverImageUrl?: string | null;
  relevantLevels?: string[];
  isPublished: boolean;
  publishedAt?: string | null;
};
type BankAccount = { id: number; bankName: string; accountNumber: string; accountHolder: string; isActive: boolean };
type FeeType = { id: number; name: string; amount: number; dueDay: number; applicableLevels?: string[]; applicablePrograms?: string[]; isRecurring: boolean; isActive: boolean };
type FeePayment = {
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
type StudentFee = {
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
type FinanceCategorySummary = { key: string; label: string; type: "income" | "expense"; target: number; paid: number; outstanding: number; count: number };
type FinanceEntry = {
  id: number;
  type: "income" | "expense";
  category: string;
  title: string;
  amount: number;
  entryDate: string;
  source?: string | null;
  notes?: string | null;
};
type TeacherPayroll = {
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
type FinanceOverview = {
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

type AiHistory = { id: number; role: "user" | "model"; message: string; tokensUsed?: number | null; createdAt?: string; user?: User | null; student?: Student | null };
type AiUsage = {
  global: { dailyRequests: number; tokensPerMinute: number };
  totals: { requests: number; tokens: number; activeAiUsers: number };
  users: Array<{ user: User; quota: { dailyRequestLimit: number; tokensPerMinuteLimit: number; weight: number; parentUserCount?: number; parentDailyRequestLimit?: number }; requestsToday: number; tokensToday: number; remainingRequests: number }>;
};
type RolePermission = { id: number; name: string };
type RoleMatrix = { id: number; name: string; permissions: RolePermission[] };

const emptyList: unknown[] = [];
const levels = ["KB", "TK A", "TK B", "TK C"];
const compactLevels = ["KB", "TKA", "TKB", "TKC"];
const statusColors: Record<string, string> = {
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
const pieColors = ["#0a1f5c", "#f5c542", "#10b981", "#ef4444", "#8b5cf6"];
const feeProgramScopes = [
  { value: "all", label: "Semua program", programs: [] as string[], levels },
  { value: "regular", label: "Reguler", programs: ["regular"], levels },
  { value: "half_day", label: "Half-day", programs: ["half_day"], levels },
  { value: "full_day", label: "Full-day", programs: ["full_day"], levels: ["TK B", "TK C"] },
];

function feeScopeFromItem(item?: FeeType | null) {
  const programs = item?.applicablePrograms ?? [];
  if (programs.length === 1) return programs[0];
  return "all";
}

function feeScope(value: string) {
  return feeProgramScopes.find((item) => item.value === value) ?? feeProgramScopes[0];
}

function listFrom<T>(response?: ApiResponse<T[]>): T[] {
  return Array.isArray(response?.data) ? response.data : (emptyList as T[]);
}

function useList<T>(key: unknown[], endpoint: string, enabled = true) {
  return useQuery({ queryKey: key, queryFn: () => apiFetch<T[]>(endpoint), enabled, retry: false, staleTime: 5 * 60 * 1000, placeholderData: keepPreviousData });
}

function useItem<T>(key: unknown[], endpoint: string, enabled = true) {
  return useQuery({ queryKey: key, queryFn: () => apiFetch<T>(endpoint), enabled, retry: false, staleTime: 5 * 60 * 1000, placeholderData: keepPreviousData });
}

function buildQuery(path: string, params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") search.set(key, String(value));
  });
  return search.toString() ? `${path}?${search}` : path;
}

function todayInput() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function monthName(month?: number, year?: number) {
  if (!month || !year) return "-";
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function money(value?: number | null) {
  return `Rp ${Number(value ?? 0).toLocaleString("id-ID")}`;
}

function compactMoney(value?: number | null) {
  return formatRupiah(Number(value ?? 0), true);
}

function lines(value: string) {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function appendFormValue(formData: FormData, key: string, value: string | number | boolean | undefined | null) {
  if (value === undefined || value === null || value === "") return;
  formData.append(key, String(value));
}

function appendArray(formData: FormData, key: string, values: string[]) {
  values.forEach((value) => formData.append(`${key}[]`, value));
}

function PageHeader({ children }: { title: string; description: string; icon: ReactNode; children?: ReactNode }) {
  if (!children) return null;

  return (
    <section className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-2.5 lg:flex-row lg:items-center lg:justify-between">
      {children}
    </section>
  );
}

function Breadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
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

function Panel({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
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

function Badge({ value }: { value?: string | null }) {
  return <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10.5px] font-bold ${statusColors[value ?? ""] ?? "bg-slate-50 text-slate-700 border-slate-200"}`}>{label(value)}</span>;
}

function label(value?: string | null) {
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

function Input({ label: inputLabel, value, onChange, type = "text", required, max }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; max?: string }) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold text-[#0a1f5c]">
      {inputLabel}
      <input className="madani-input" type={type} required={required} max={max} value={value} onChange={(event) => onChange(event.target.value)} suppressHydrationWarning />
    </label>
  );
}

function Textarea({ label: inputLabel, value, onChange, rows = 4, required }: { label: string; value: string; onChange: (value: string) => void; rows?: number; required?: boolean }) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold text-[#0a1f5c]">
      {inputLabel}
      <textarea className="madani-input min-h-[96px]" rows={rows} required={required} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function FileInput({ label: inputLabel, files, onChange, multiple = false, accept = "image/*,.pdf" }: { label: string; files: File[]; onChange: (files: File[]) => void; multiple?: boolean; accept?: string }) {
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

function Select({ label: inputLabel, value, onChange, children, required }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode; required?: boolean }) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold text-[#0a1f5c]">
      {inputLabel}
      <select className="madani-input" required={required} value={value} onChange={(event) => onChange(event.target.value)} suppressHydrationWarning>
        {children}
      </select>
    </label>
  );
}

function Button({ children, onClick, tone = "primary", disabled, type = "button" }: { children: ReactNode; onClick?: () => void; tone?: "primary" | "plain" | "danger"; disabled?: boolean; type?: "button" | "submit" }) {
  const cls = tone === "danger"
    ? "border-rose-200 bg-rose-50 text-rose-700"
    : tone === "plain"
      ? "border-slate-200 bg-white text-[#0a1f5c]"
      : "border-[#0a1f5c] bg-[#0a1f5c] text-white";
  return <button type={type} disabled={disabled} onClick={onClick} className={`madani-button border ${cls} disabled:cursor-not-allowed disabled:opacity-50`}>{children}</button>;
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="relative block min-w-[220px]">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]" />
      <input className="madani-input w-full" style={{ paddingLeft: 38 }} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function studentClass(student?: Student | null) {
  return student?.classes?.[0]?.name ?? "Belum ada kelas";
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

function studentLevel(student?: Student | null) {
  return normalizeLevel(student?.classes?.[0]?.level);
}

function matchesLevel(value?: string | null, filter?: string) {
  if (!filter) return true;
  return normalizeLevel(value) === filter;
}

function levelTabs(source: Student[]) {
  return [
    { value: "", label: "Semua", count: source.length },
    ...levels.map((level) => ({
      value: level,
      label: level,
      count: source.filter((student) => matchesLevel(studentLevel(student), level)).length,
    })),
  ];
}

function LevelTabs({ items, value, onChange }: { items: Array<{ value: string; label: string; count?: number }>; value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
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
              <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-white/16 text-white" : "bg-slate-100 text-[#64748b]"}`}>
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function initials(value?: string | null) {
  return (value ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase())
    .join("") || "M";
}

function Modal({ open, title, description, children, onClose }: { open: boolean; title: string; description?: string; children: ReactNode; onClose: () => void }) {
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

function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-xs font-medium text-[#64748b]">{text}</div>;
}

function PhotoStrip({ urls, dense = false }: { urls?: string[]; dense?: boolean }) {
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

function StudentOptions({ students }: { students: Student[] }) {
  return (
    <>
      <option value="">Pilih murid</option>
      {students.map((student) => <option key={student.id} value={student.id}>{student.fullName}</option>)}
    </>
  );
}

function ClassOptions({ classes }: { classes: SchoolClass[] }) {
  return (
    <>
      <option value="">Pilih kelas</option>
      {classes.map((item) => <option key={item.id} value={item.id}>{item.name} / {item.level}</option>)}
    </>
  );
}

export function AbsenceRequestsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [date, setDate] = useState("");
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState<Record<number, string>>({});
  const requests = listFrom(useList<AbsenceRequest>(["absence-requests", status, date], buildQuery("/absence-requests", { status, date, perPage: 100 })).data);
  const filteredRequests = requests.filter((item) => [item.student?.fullName ?? "", studentClass(item.student), item.type, label(item.status), item.reason, formatDate(item.date)].join(" ").toLowerCase().includes(search.toLowerCase()));
  const review = useMutation({
    mutationFn: ({ id, nextStatus }: { id: number; nextStatus: "approved" | "rejected" }) =>
      apiFetch(`/absence-requests/${id}/review`, { method: "PUT", body: { status: nextStatus, notes: notes[id] ?? "" } }),
    onSuccess: () => {
      toast.success("Permohonan izin diperbarui");
      queryClient.invalidateQueries({ queryKey: ["absence-requests"] });
    },
    onError: (error) => toast.error(error.message),
  });
  const remove = useMutation({
    mutationFn: (id: number) => apiFetch(`/absence-requests/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Permohonan izin dihapus");
      queryClient.invalidateQueries({ queryKey: ["absence-requests"] });
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="grid gap-4">
      <PageHeader title="Permohonan Izin" description="Approve atau reject izin sakit/izin dari orang tua." icon={<CalendarCheck className="h-5 w-5" />}>
        <div className="flex w-full flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid gap-1">
            <p className="text-xs font-bold uppercase text-[#64748b]">Hari ini, {formatDate(todayInput())}</p>
            <SearchBox value={search} onChange={setSearch} placeholder="Cari murid, alasan, status" />
          </div>
          <div className="grid gap-2 sm:grid-cols-[160px_170px]">
          <Select label="Status" value={status} onChange={setStatus}><option value="">Semua</option><option value="pending">Pending</option><option value="approved">Disetujui</option><option value="rejected">Ditolak</option></Select>
          <Input label="Tanggal" type="date" max={todayInput()} value={date} onChange={setDate} />
          </div>
        </div>
      </PageHeader>
      <div className="grid gap-3 xl:grid-cols-2">
        {filteredRequests.map((item) => (
          <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-extrabold text-[#0a1f5c]">{item.student?.fullName ?? "Murid"}</h2>
                <p className="text-sm text-[#64748b]">{studentClass(item.student)} / {label(item.type)}</p>
              </div>
              <div className="text-right">
                <p className="mb-1 text-xs font-semibold text-[#64748b]">{formatDate(item.date)}</p>
                <Badge value={item.status} />
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#334155]">{item.reason}</p>
            {item.documentUrl ? <a className="mt-2 inline-flex text-xs font-bold text-[#0a1f5c]" href={item.documentUrl} target="_blank" rel="noreferrer">Lihat dokumen</a> : null}
            <Textarea label="Catatan reviewer" value={notes[item.id] ?? ""} onChange={(value) => setNotes({ ...notes, [item.id]: value })} rows={2} />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button disabled={review.isPending || item.status !== "pending"} onClick={() => review.mutate({ id: item.id, nextStatus: "approved" })}><Check className="h-4 w-4" />Approve</Button>
              <Button tone="danger" disabled={review.isPending || item.status !== "pending"} onClick={() => review.mutate({ id: item.id, nextStatus: "rejected" })}><X className="h-4 w-4" />Reject</Button>
              <Button tone="plain" disabled={remove.isPending} onClick={() => { if (window.confirm("Hapus permohonan izin ini?")) remove.mutate(item.id); }}><Trash2 className="h-4 w-4" />Hapus</Button>
            </div>
          </article>
        ))}
        {filteredRequests.length === 0 ? <Empty text="Belum ada permohonan izin sesuai filter." /> : null}
      </div>
    </div>
  );
}

export function HafalanPage() {
  const students = listFrom(useList<Student>(["students", "hafalan"], "/students?perPage=100").data);
  const surahs = listFrom(useList<HafalanSurah>(["hafalan-surahs"], "/hafalan/surahs").data);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const filteredStudents = students.filter((student) => {
    const matchSearch = [student.fullName, student.nickname ?? "", student.nis ?? "", studentClass(student)].join(" ").toLowerCase().includes(search.toLowerCase());
    return matchSearch && matchesLevel(studentLevel(student), levelFilter);
  });
  const selectedStudent = students.find((student) => student.id === selectedId) ?? filteredStudents[0];
  const detail = useItem<{ student: Student; surahs: HafalanSurah[] }>(["hafalan-preview", selectedStudent?.id], `/hafalan/student/${selectedStudent?.id}`, Boolean(selectedStudent?.id)).data?.data;
  const doaDetail = useItem<{ student: Student; doas: DoaItem[] }>(["doa-preview", selectedStudent?.id], `/doa/student/${selectedStudent?.id}`, Boolean(selectedStudent?.id)).data?.data;
  const masteredSurahs = (detail?.surahs ?? []).filter((item) => item.studentStatus === "mutqin" || item.studentStatus === "lancar");
  const masteredDoas = (doaDetail?.doas ?? []).filter((item) => item.studentStatus === "hafal");
  useEffect(() => {
    if (filteredStudents.length > 0 && !filteredStudents.some((student) => student.id === selectedId)) {
      setSelectedId(filteredStudents[0].id);
    }
  }, [filteredStudents, selectedId]);

  return (
    <div className="grid gap-4">
      <PageHeader title="Hafalan & Doa" description="Ringkasan internal progress hafalan per murid." icon={<Moon className="h-5 w-5" />}>
        <SearchBox value={search} onChange={setSearch} placeholder="Cari murid, NIS, kelas" />
      </PageHeader>
      <LevelTabs value={levelFilter} onChange={setLevelFilter} items={levelTabs(students)} />
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <Panel title="Daftar murid">
          <div className="grid max-h-[calc(100dvh-250px)] min-h-[360px] auto-rows-[72px] content-start gap-2 overflow-y-auto pr-1">
            {filteredStudents.map((student) => {
              const active = student.id === selectedStudent?.id;
              return (
                <button key={student.id} type="button" onClick={() => setSelectedId(student.id)} className={`h-[72px] rounded-xl border px-3 text-left transition ${active ? "border-[#0a1f5c] bg-[#0a1f5c] text-white" : "border-slate-200 bg-white text-[#0a1f5c] hover:border-[#0a1f5c]/30"}`}>
                  <div className="grid h-full grid-cols-[48px_1fr_auto] items-center gap-2.5">
                    <StudentPhotoFrame student={student} size="sm" active={active} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{student.fullName}</p>
                      <p className={`mt-0.5 truncate text-xs ${active ? "text-white/72" : "text-[#64748b]"}`}>{student.nis ?? "NIS belum diisi"} / {studentClass(student)}</p>
                    </div>
                    <span className={`text-xs font-semibold ${active ? "text-white" : "text-[#64748b]"}`}>{surahs.length} target</span>
                  </div>
                </button>
              );
            })}
            {filteredStudents.length === 0 ? <Empty text="Belum ada murid sesuai pencarian." /> : null}
          </div>
        </Panel>
        <Panel title="Biodata dan progress">
          {selectedStudent ? (
            <div className="grid gap-3">
              <div className="grid grid-cols-[80px_1fr] items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <StudentPhotoFrame student={selectedStudent} size="lg" />
                <div>
                  <p className="font-bold text-[#0a1f5c]">{selectedStudent.fullName}</p>
                  <p className="text-xs text-[#64748b]">{selectedStudent.nis ?? "NIS belum diisi"} / {studentClass(selectedStudent)}</p>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-[#64748b]">Surah lancar/mutqin</p><p className="font-display text-2xl font-extrabold text-[#0a1f5c]">{masteredSurahs.length}</p></div>
                <div className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-[#64748b]">Doa hafal</p><p className="font-display text-2xl font-extrabold text-[#0a1f5c]">{masteredDoas.length}</p></div>
              </div>
              <div>
                <p className="mb-2 text-xs font-bold text-[#0a1f5c]">Sudah pernah dihafal</p>
                <div className="flex flex-wrap gap-2">
                  {[...masteredSurahs.map((item) => item.nameLatin), ...masteredDoas.map((item) => item.name)].slice(0, 10).map((name) => <span key={name} className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">{name}</span>)}
                  {masteredSurahs.length + masteredDoas.length === 0 ? <span className="text-xs text-[#64748b]">Belum ada hafalan selesai.</span> : null}
                </div>
              </div>
              <Link href={`/hafalan/${selectedStudent.id}`} className="madani-button justify-center bg-[#0a1f5c] text-white"><Moon className="h-4 w-4" />Buka doa dan hafalan</Link>
            </div>
          ) : <Empty text="Pilih murid untuk melihat detail." />}
        </Panel>
      </section>
    </div>
  );
}

export function HafalanStudentPage({ studentId }: { studentId: number }) {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const [level, setLevel] = useState("");
  const [tab, setTab] = useState<"surah" | "doa">("surah");
  const [surahOpen, setSurahOpen] = useState(false);
  const [doaOpen, setDoaOpen] = useState(false);
  const [surahForm, setSurahForm] = useState({ surahNumber: "", nameArabic: "", nameLatin: "", nameId: "", totalAyat: "", targetLevel: "KB" });
  const [doaForm, setDoaForm] = useState({ name: "", arabicText: "", latinText: "", meaning: "", category: "aktivitas_harian" });
  const data = useItem<{ student: Student; surahs: HafalanSurah[] }>(["hafalan-student", studentId], `/hafalan/student/${studentId}`, Boolean(studentId)).data?.data;
  const doaData = useItem<{ student: Student; doas: DoaItem[] }>(["doa-student", studentId], `/doa/student/${studentId}`, Boolean(studentId)).data?.data;
  const surahs = (data?.surahs ?? []).filter((item) => !level || item.targetLevel === level);
  const doas = doaData?.doas ?? [];
  const done = (data?.surahs ?? []).filter((item) => item.studentStatus === "mutqin").length;
  const updateSurah = useMutation({
    mutationFn: ({ surahId, status }: { surahId: number; status: HafalanStatus }) => apiFetch(`/hafalan/student/${studentId}/surah`, { method: "POST", body: { surahId, status } }),
    onSuccess: () => {
      toast.success("Progress hafalan tersimpan");
      queryClient.invalidateQueries({ queryKey: ["hafalan-student"] });
    },
    onError: (error) => toast.error(error.message),
  });
  const updateDoa = useMutation({
    mutationFn: ({ doaId, status }: { doaId: number; status: DoaStatus }) => apiFetch(`/doa/student/${studentId}/update`, { method: "POST", body: { doaId, status } }),
    onSuccess: () => {
      toast.success("Progress doa tersimpan");
      queryClient.invalidateQueries({ queryKey: ["doa-student"] });
    },
    onError: (error) => toast.error(error.message),
  });
  const createSurah = useMutation({
    mutationFn: () => apiFetch("/hafalan/surahs", { method: "POST", body: { ...surahForm, surahNumber: Number(surahForm.surahNumber), totalAyat: Number(surahForm.totalAyat) } }),
    onSuccess: () => {
      toast.success("Surah ditambahkan");
      setSurahOpen(false);
      setSurahForm({ surahNumber: "", nameArabic: "", nameLatin: "", nameId: "", totalAyat: "", targetLevel: "KB" });
      queryClient.invalidateQueries({ queryKey: ["hafalan-student"] });
      queryClient.invalidateQueries({ queryKey: ["hafalan-surahs"] });
    },
    onError: (error) => toast.error(error.message),
  });
  const createDoa = useMutation({
    mutationFn: () => apiFetch("/hafalan/doa", { method: "POST", body: doaForm }),
    onSuccess: () => {
      toast.success("Doa ditambahkan");
      setDoaOpen(false);
      setDoaForm({ name: "", arabicText: "", latinText: "", meaning: "", category: "aktivitas_harian" });
      queryClient.invalidateQueries({ queryKey: ["doa-student"] });
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="grid gap-4">
      <Breadcrumbs items={[{ label: "Hafalan", href: "/hafalan" }, { label: data?.student?.fullName ?? "Detail murid" }]} />
      <PageHeader title={data?.student?.fullName ?? "Detail Hafalan"} description={`${done} surah mutqin dari ${data?.surahs?.length ?? 0} target`} icon={<Moon className="h-5 w-5" />}>
        <div className="flex flex-wrap gap-2">
          <Button tone={tab === "surah" ? "primary" : "plain"} onClick={() => setTab("surah")}>Surah</Button>
          <Button tone={tab === "doa" ? "primary" : "plain"} onClick={() => setTab("doa")}>Doa Harian</Button>
          {can("manage_hafalan_definitions") && tab === "surah" ? <Button tone="plain" onClick={() => setSurahOpen(true)}><Plus className="h-4 w-4" />Tambah Surah</Button> : null}
          {can("manage_hafalan_definitions") && tab === "doa" ? <Button tone="plain" onClick={() => setDoaOpen(true)}><Plus className="h-4 w-4" />Tambah Doa</Button> : null}
        </div>
      </PageHeader>
      {tab === "surah" ? (
        <Panel title="Grid Surah">
          <div className="mb-3 flex flex-wrap gap-2">
            <Button tone={level === "" ? "primary" : "plain"} onClick={() => setLevel("")}>Semua</Button>
            {compactLevels.map((item) => <Button key={item} tone={level === item ? "primary" : "plain"} onClick={() => setLevel(item)}>{label(item)}</Button>)}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {surahs.map((surah) => (
              <article key={surah.id} className={`rounded-2xl border p-4 ${statusColors[surah.studentStatus ?? "belum"]}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-lg font-extrabold">{surah.nameLatin}</p>
                    <p className="text-xs font-semibold opacity-80">{surah.nameArabic} / {surah.totalAyat} ayat</p>
                  </div>
                  <Badge value={surah.studentStatus ?? "belum"} />
                </div>
                {can("update_student_hafalan") ? (
                  <select className="madani-input mt-3" value={surah.studentStatus ?? "belum"} onChange={(event) => updateSurah.mutate({ surahId: surah.id, status: event.target.value as HafalanStatus })}>
                    <option value="belum">Belum</option>
                    <option value="sedang_dihafal">Sedang dihafal</option>
                    <option value="lancar">Lancar</option>
                    <option value="mutqin">Mutqin</option>
                  </select>
                ) : null}
              </article>
            ))}
          </div>
        </Panel>
      ) : (
        <Panel title="Doa Harian">
          <div className="grid gap-3 md:grid-cols-2">
            {doas.map((doa) => (
              <article key={doa.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-[#0a1f5c]">{doa.name}</h2>
                    <p className="mt-2 text-lg leading-8 text-[#0a1f5c]">{doa.arabicText}</p>
                    <p className="mt-2 text-sm italic text-[#64748b]">{doa.latinText}</p>
                    <p className="mt-1 text-sm text-[#334155]">{doa.meaning}</p>
                  </div>
                  <Badge value={doa.studentStatus ?? "belum"} />
                </div>
                {can("update_student_hafalan") ? (
                  <select className="madani-input mt-3" value={doa.studentStatus ?? "belum"} onChange={(event) => updateDoa.mutate({ doaId: doa.id, status: event.target.value as DoaStatus })}>
                    <option value="belum">Belum</option>
                    <option value="sedang_dipelajari">Sedang dipelajari</option>
                    <option value="hafal">Hafal</option>
                  </select>
                ) : null}
              </article>
            ))}
          </div>
        </Panel>
      )}
      <Modal open={surahOpen} title="Tambah surah" onClose={() => setSurahOpen(false)}>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); createSurah.mutate(); }}>
          <Input label="Nomor surah" type="number" value={surahForm.surahNumber} onChange={(value) => setSurahForm({ ...surahForm, surahNumber: value })} required />
          <Input label="Total ayat" type="number" value={surahForm.totalAyat} onChange={(value) => setSurahForm({ ...surahForm, totalAyat: value })} required />
          <Input label="Nama latin" value={surahForm.nameLatin} onChange={(value) => setSurahForm({ ...surahForm, nameLatin: value })} required />
          <Input label="Nama Indonesia" value={surahForm.nameId} onChange={(value) => setSurahForm({ ...surahForm, nameId: value })} required />
          <Input label="Nama Arab" value={surahForm.nameArabic} onChange={(value) => setSurahForm({ ...surahForm, nameArabic: value })} required />
          <Select label="Target level" value={surahForm.targetLevel} onChange={(value) => setSurahForm({ ...surahForm, targetLevel: value })}><option value="KB">KB</option><option value="TKA">TK A</option><option value="TKB">TK B</option><option value="TKC">TK C</option></Select>
          <div className="md:col-span-2"><Button type="submit" disabled={createSurah.isPending}><Save className="h-4 w-4" />Simpan Surah</Button></div>
        </form>
      </Modal>
      <Modal open={doaOpen} title="Tambah doa" onClose={() => setDoaOpen(false)}>
        <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); createDoa.mutate(); }}>
          <Input label="Nama doa" value={doaForm.name} onChange={(value) => setDoaForm({ ...doaForm, name: value })} required />
          <Select label="Kategori" value={doaForm.category} onChange={(value) => setDoaForm({ ...doaForm, category: value })}><option value="aktivitas_harian">Aktivitas harian</option><option value="ibadah">Ibadah</option><option value="adab">Adab</option></Select>
          <Textarea label="Arab" value={doaForm.arabicText} onChange={(value) => setDoaForm({ ...doaForm, arabicText: value })} rows={3} required />
          <Textarea label="Latin" value={doaForm.latinText} onChange={(value) => setDoaForm({ ...doaForm, latinText: value })} rows={3} required />
          <Textarea label="Arti" value={doaForm.meaning} onChange={(value) => setDoaForm({ ...doaForm, meaning: value })} rows={3} required />
          <Button type="submit" disabled={createDoa.isPending}><Save className="h-4 w-4" />Simpan Doa</Button>
        </form>
      </Modal>
    </div>
  );
}

function PortfolioEditor({ portfolioId, onSaved }: { portfolioId?: number; onSaved?: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const students = listFrom(useList<Student>(["students", "portfolio-form"], "/students?perPage=100").data);
  const areas = listFrom(useList<MontessoriArea>(["areas", "portfolio-form"], "/montessori/areas").data);
  const existing = useItem<Portfolio>(["portfolio", portfolioId], `/portfolios/${portfolioId}`, Boolean(portfolioId)).data?.data;
  const [form, setForm] = useState({ studentId: "", areaId: "", title: "", description: "", workDate: todayInput(), photoUrls: "" });
  const [files, setFiles] = useState<File[]>([]);
  useEffect(() => {
    if (existing && !form.title) {
      setForm({
        studentId: String(existing.student?.id ?? ""),
        areaId: String(existing.area?.id ?? ""),
        title: existing.title,
        description: existing.description ?? "",
        workDate: existing.workDate?.slice(0, 10) ?? todayInput(),
        photoUrls: (existing.photoUrls ?? []).join("\n"),
      });
    }
  }, [existing, form.title]);
  const save = useMutation({
    mutationFn: () => {
      const body = new FormData();
      if (portfolioId) body.append("_method", "PUT");
      appendFormValue(body, "studentId", Number(form.studentId));
      appendFormValue(body, "areaId", form.areaId ? Number(form.areaId) : undefined);
      appendFormValue(body, "title", form.title);
      appendFormValue(body, "description", form.description);
      appendFormValue(body, "workDate", form.workDate);
      appendArray(body, "photoUrls", lines(form.photoUrls));
      files.forEach((file) => body.append("photos[]", file));
      return apiFetch(portfolioId ? `/portfolios/${portfolioId}` : "/portfolios", { method: portfolioId ? "POST" : "POST", body });
    },
    onSuccess: () => {
      toast.success("Portofolio tersimpan");
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
      if (onSaved) onSaved();
      else router.push("/portfolios");
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <Panel title={portfolioId ? "Edit portofolio" : "Upload karya anak"}>
      <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
        <Select label="Murid" value={form.studentId} onChange={(value) => setForm({ ...form, studentId: value })} required><StudentOptions students={students} /></Select>
        <Select label="Area Montessori" value={form.areaId} onChange={(value) => setForm({ ...form, areaId: value })}><option value="">Tanpa area</option>{areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</Select>
        <Input label="Tanggal karya" type="date" max={todayInput()} value={form.workDate} onChange={(value) => setForm({ ...form, workDate: value })} required />
        <div className="md:col-span-2"><Input label="Judul" value={form.title} onChange={(value) => setForm({ ...form, title: value })} required /></div>
        <div className="md:col-span-2"><Textarea label="Deskripsi" value={form.description} onChange={(value) => setForm({ ...form, description: value })} /></div>
        <div className="md:col-span-2"><FileInput label="Upload foto" files={files} onChange={setFiles} multiple accept="image/*" /></div>
        <div className="md:col-span-2"><Textarea label="URL foto (satu per baris)" value={form.photoUrls} onChange={(value) => setForm({ ...form, photoUrls: value })} rows={5} /></div>
        <div className="md:col-span-2"><Button type="submit" disabled={save.isPending}><Save className="h-4 w-4" />Simpan</Button></div>
      </form>
    </Panel>
  );
}

export function PortfoliosPage({ initialNewOpen = false }: { initialNewOpen?: boolean } = {}) {
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(initialNewOpen);
  const students = listFrom(useList<Student>(["students", "portfolio-options"], "/students?perPage=100").data);
  const portfolios = listFrom(useList<Portfolio>(["portfolios"], "/portfolios?perPage=100").data);
  const filteredStudents = students.filter((student) => {
    const matchSearch = [student.fullName, student.nickname ?? "", student.nis ?? "", studentClass(student)].join(" ").toLowerCase().includes(search.toLowerCase());
    return matchSearch && matchesLevel(studentLevel(student), levelFilter);
  });
  const selectedStudent = students.find((student) => student.id === selectedStudentId) ?? filteredStudents[0];
  const selectedPortfolios = selectedStudent ? portfolios.filter((item) => item.student?.id === selectedStudent.id) : [];
  useEffect(() => {
    if (filteredStudents.length > 0 && !filteredStudents.some((student) => student.id === selectedStudentId)) {
      setSelectedStudentId(filteredStudents[0].id);
    }
  }, [filteredStudents, selectedStudentId]);
  return (
    <div className="grid gap-4">
      {initialNewOpen ? <Breadcrumbs items={[{ label: "Portofolio", href: "/portfolios" }, { label: "Upload" }]} /> : null}
      <PageHeader title="Portofolio" description="Dokumentasi karya anak per murid dan area Montessori." icon={<ImageIcon className="h-5 w-5" />}>
        <SearchBox value={search} onChange={setSearch} placeholder="Cari murid, NIS, kelas" />
      </PageHeader>
      <LevelTabs value={levelFilter} onChange={setLevelFilter} items={levelTabs(students)} />
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(380px,0.9fr)]">
        <Panel title="Daftar murid">
          <div className="grid max-h-[calc(100dvh-260px)] min-h-[360px] auto-rows-[72px] content-start gap-2 overflow-y-auto pr-1">
            {filteredStudents.map((student) => {
              const count = portfolios.filter((item) => item.student?.id === student.id).length;
              const active = selectedStudent?.id === student.id;
              return (
                <button key={student.id} type="button" onClick={() => setSelectedStudentId(student.id)} className={`h-[72px] rounded-xl border px-3 text-left transition ${active ? "border-[#0a1f5c] bg-[#0a1f5c] text-white" : "border-slate-200 bg-white text-[#0a1f5c] hover:border-[#0a1f5c]/30"}`}>
                  <div className="grid h-full grid-cols-[48px_1fr_auto] items-center gap-2.5">
                    <StudentPhotoFrame student={student} size="sm" active={active} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{student.fullName}</p>
                      <p className={`mt-0.5 truncate text-xs ${active ? "text-white/72" : "text-[#64748b]"}`}>{student.nis ?? "NIS belum diisi"} / {studentClass(student)}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"}`}>{count} karya</span>
                  </div>
                </button>
              );
            })}
            {filteredStudents.length === 0 ? <Empty text="Belum ada murid sesuai pencarian." /> : null}
          </div>
        </Panel>
        <Panel title="Portofolio murid">
          {selectedStudent ? (
            <div className="grid gap-3">
              <div className="grid grid-cols-[72px_1fr] items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <StudentPhotoFrame student={selectedStudent} size="lg" />
                <div className="min-w-0">
                  <p className="truncate font-bold text-[#0a1f5c]">{selectedStudent.fullName}</p>
                  <p className="text-xs text-[#64748b]">{selectedStudent.nis ?? "NIS belum diisi"} / {studentClass(selectedStudent)}</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {selectedPortfolios.map((item) => (
                  <Link key={item.id} href={`/portfolios/${item.id}`} className="rounded-xl border border-slate-200 bg-white p-3 transition hover:border-[#0a1f5c]/30">
                    <PhotoStrip urls={item.photoUrls} />
                    <h2 className="mt-3 line-clamp-1 font-bold text-[#0a1f5c]">{item.title}</h2>
                    <p className="text-xs text-[#64748b]">{item.area?.name ?? "Area belum diisi"} / {formatDate(item.workDate)}</p>
                  </Link>
                ))}
                {selectedPortfolios.length === 0 ? <Empty text="Belum ada portofolio untuk murid ini." /> : null}
              </div>
            </div>
          ) : (
            <Empty text="Pilih murid untuk melihat portofolio." />
          )}
        </Panel>
      </section>
      <Modal open={formOpen} title="Upload portofolio" description="Tambah karya anak tanpa meninggalkan daftar." onClose={() => setFormOpen(false)}><PortfolioEditor onSaved={() => setFormOpen(false)} /></Modal>
    </div>
  );
}

export function PortfolioNewPage() {
  return <PortfoliosPage initialNewOpen />;
}

export function PortfolioDetailPage({ id }: { id: number }) {
  const { can } = usePermissions();
  const item = useItem<Portfolio>(["portfolio", id], `/portfolios/${id}`, Boolean(id)).data?.data;
  return (
    <div className="grid gap-4">
      <Breadcrumbs items={[{ label: "Portofolio", href: "/portfolios" }, { label: item?.title ?? "Detail karya" }]} />
      <PageHeader title={item?.title ?? "Detail Portofolio"} description={`${item?.student?.fullName ?? "-"} / ${formatDate(item?.workDate)}`} icon={<ImageIcon className="h-5 w-5" />} />
      <Panel title="Foto karya"><PhotoStrip urls={item?.photoUrls} dense /><p className="mt-3 text-sm leading-6 text-[#334155]">{item?.description}</p></Panel>
      {can("manage_portfolios") ? <PortfolioEditor portfolioId={id} /> : null}
    </div>
  );
}

function GalleryEditor({ galleryId, onSaved }: { galleryId?: number; onSaved?: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const classes = listFrom(useList<SchoolClass>(["classes", "gallery-form"], "/classes?perPage=100").data);
  const existing = useItem<Gallery>(["gallery", galleryId], `/galleries/${galleryId}`, Boolean(galleryId)).data?.data;
  const [form, setForm] = useState({ classId: "", eventName: "", description: "", eventDate: todayInput(), photoUrls: "" });
  const [files, setFiles] = useState<File[]>([]);
  useEffect(() => {
    if (existing && !form.eventName) setForm({ classId: String(existing.class?.id ?? ""), eventName: existing.eventName, description: existing.description ?? "", eventDate: existing.eventDate?.slice(0, 10) ?? todayInput(), photoUrls: (existing.photoUrls ?? []).join("\n") });
  }, [existing, form.eventName]);
  const save = useMutation({
    mutationFn: () => {
      const body = new FormData();
      if (galleryId) body.append("_method", "PUT");
      appendFormValue(body, "classId", Number(form.classId));
      appendFormValue(body, "eventName", form.eventName);
      appendFormValue(body, "description", form.description);
      appendFormValue(body, "eventDate", form.eventDate);
      appendArray(body, "photoUrls", lines(form.photoUrls));
      files.forEach((file) => body.append("photos[]", file));
      return apiFetch(galleryId ? `/galleries/${galleryId}` : "/galleries", { method: "POST", body });
    },
    onSuccess: () => { toast.success("Galeri tersimpan"); queryClient.invalidateQueries({ queryKey: ["galleries"] }); if (onSaved) onSaved(); else router.push("/galleries"); },
    onError: (error) => toast.error(error.message),
  });
  return (
    <Panel title={galleryId ? "Edit galeri" : "Upload galeri event"}>
      <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
        {!galleryId ? <Select label="Kelas" value={form.classId} onChange={(value) => setForm({ ...form, classId: value })} required><ClassOptions classes={classes} /></Select> : null}
        <Input label="Tanggal event" type="date" max={todayInput()} value={form.eventDate} onChange={(value) => setForm({ ...form, eventDate: value })} required />
        <div className="md:col-span-2"><Input label="Nama event" value={form.eventName} onChange={(value) => setForm({ ...form, eventName: value })} required /></div>
        <div className="md:col-span-2"><Textarea label="Deskripsi" value={form.description} onChange={(value) => setForm({ ...form, description: value })} /></div>
        <div className="md:col-span-2"><FileInput label="Upload foto" files={files} onChange={setFiles} multiple accept="image/*" /></div>
        <div className="md:col-span-2"><Textarea label="URL foto (satu per baris)" value={form.photoUrls} onChange={(value) => setForm({ ...form, photoUrls: value })} rows={5} /></div>
        <div className="md:col-span-2"><Button type="submit" disabled={save.isPending}><Save className="h-4 w-4" />Simpan</Button></div>
      </form>
    </Panel>
  );
}

export function GalleriesPage({ initialNewOpen = false }: { initialNewOpen?: boolean } = {}) {
  const { can } = usePermissions();
  const [formOpen, setFormOpen] = useState(initialNewOpen);
  const [search, setSearch] = useState("");
  const galleries = listFrom(useList<Gallery>(["galleries"], "/galleries?perPage=100").data);
  const filtered = galleries.filter((item) => [item.eventName, item.class?.name ?? "", item.description ?? ""].join(" ").toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="grid gap-4">
      {initialNewOpen ? <Breadcrumbs items={[{ label: "Galeri", href: "/galleries" }, { label: "Upload" }]} /> : null}
      <PageHeader title="Galeri Kelas" description="Dokumentasi event kelas dan kegiatan sekolah." icon={<ImageIcon className="h-5 w-5" />}>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <SearchBox value={search} onChange={setSearch} placeholder="Cari galeri, kelas, event" />
          {can("manage_galleries") ? <Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" />Upload</Button> : null}
        </div>
      </PageHeader>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map((item) => <Link key={item.id} href={`/galleries/${item.id}`} className="rounded-2xl border border-slate-200 bg-white p-3"><PhotoStrip urls={item.photoUrls} /><h2 className="mt-3 font-bold text-[#0a1f5c]">{item.eventName}</h2><p className="text-sm text-[#64748b]">{item.class?.name ?? "-"} / {formatDate(item.eventDate)} / {item.photoUrls?.length ?? 0} foto</p></Link>)}{filtered.length === 0 ? <Empty text="Belum ada galeri sesuai pencarian." /> : null}</div>
      <Modal open={formOpen} title="Upload galeri" description="Tambah event galeri tanpa meninggalkan daftar." onClose={() => setFormOpen(false)}><GalleryEditor onSaved={() => setFormOpen(false)} /></Modal>
    </div>
  );
}

export function GalleryNewPage() {
  return <GalleriesPage initialNewOpen />;
}

export function GalleryDetailPage({ id }: { id: number }) {
  const { can } = usePermissions();
  const item = useItem<Gallery>(["gallery", id], `/galleries/${id}`, Boolean(id)).data?.data;
  return <div className="grid gap-4"><Breadcrumbs items={[{ label: "Galeri", href: "/galleries" }, { label: item?.eventName ?? "Detail event" }]} /><PageHeader title={item?.eventName ?? "Detail Galeri"} description={`${item?.class?.name ?? "-"} / ${formatDate(item?.eventDate)}`} icon={<ImageIcon className="h-5 w-5" />} /><Panel title="Foto event"><PhotoStrip urls={item?.photoUrls} dense /><p className="mt-3 text-sm leading-6 text-[#334155]">{item?.description}</p></Panel>{can("manage_galleries") ? <GalleryEditor galleryId={id} /> : null}</div>;
}

function ArticleEditor({ articleId, onSaved }: { articleId?: number; onSaved?: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const existing = useItem<Article>(["article", articleId], `/articles/${articleId}`, Boolean(articleId)).data?.data;
  const [form, setForm] = useState({ title: "", category: "montessori", coverImageUrl: "", relevantLevels: "KB\nTK A\nTK B\nTK C", status: "draft", content: "" });
  const [coverFiles, setCoverFiles] = useState<File[]>([]);
  useEffect(() => {
    if (existing && !form.title) setForm({ title: existing.title, category: existing.category, coverImageUrl: existing.coverImageUrl ?? "", relevantLevels: (existing.relevantLevels ?? []).join("\n"), status: existing.isPublished ? "publish" : "draft", content: existing.content });
  }, [existing, form.title]);
  function toggleRelevantLevel(level: string) {
    const current = lines(form.relevantLevels);
    setForm({ ...form, relevantLevels: current.includes(level) ? current.filter((item) => item !== level).join("\n") : [...current, level].join("\n") });
  }
  const save = useMutation({
    mutationFn: () => {
      const body = new FormData();
      if (articleId) body.append("_method", "PUT");
      appendFormValue(body, "title", form.title);
      appendFormValue(body, "category", form.category);
      appendFormValue(body, "coverImageUrl", form.coverImageUrl);
      appendFormValue(body, "content", form.content);
      appendFormValue(body, "isPublished", form.status === "publish");
      appendArray(body, "relevantLevels", lines(form.relevantLevels));
      if (coverFiles[0]) body.append("cover", coverFiles[0]);
      return apiFetch(articleId ? `/articles/${articleId}` : "/articles", { method: "POST", body });
    },
    onSuccess: () => { toast.success("Artikel tersimpan"); queryClient.invalidateQueries({ queryKey: ["articles"] }); if (onSaved) onSaved(); else router.push("/articles"); },
    onError: (error) => toast.error(error.message),
  });
  return (
    <Panel title={articleId ? "Edit artikel" : "Artikel baru"}>
      <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
        <Input label="Judul" value={form.title} onChange={(value) => setForm({ ...form, title: value })} required />
        <div className="grid gap-3 md:grid-cols-2">
          <Select label="Kategori" value={form.category} onChange={(value) => setForm({ ...form, category: value })} required><option value="montessori">Montessori</option><option value="islami">Islami</option><option value="tumbuh_kembang">Tumbuh Kembang</option><option value="nutrisi">Nutrisi</option><option value="aktivitas_rumah">Aktivitas Rumah</option></Select>
          <Select label="Status" value={form.status} onChange={(value) => setForm({ ...form, status: value })}><option value="draft">Draft</option><option value="publish">Publish</option></Select>
          <Input label="Cover image URL" value={form.coverImageUrl} onChange={(value) => setForm({ ...form, coverImageUrl: value })} />
        </div>
        <FileInput label="Upload cover" files={coverFiles} onChange={(files) => setCoverFiles(files.slice(0, 1))} accept="image/*" />
        <div className="grid gap-1.5">
          <p className="text-xs font-semibold text-[#0a1f5c]">Level relevan</p>
          <div className="flex flex-wrap gap-2">
            {levels.map((level) => {
              const active = lines(form.relevantLevels).includes(level);
              return <button key={level} type="button" onClick={() => toggleRelevantLevel(level)} className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${active ? "border-[#0a1f5c] bg-[#0a1f5c] text-white" : "border-slate-200 bg-white text-[#0a1f5c]"}`}>{level}</button>;
            })}
          </div>
        </div>
        <Textarea label="Konten" value={form.content} onChange={(value) => setForm({ ...form, content: value })} rows={12} required />
        <Button type="submit" disabled={save.isPending}><Save className="h-4 w-4" />Simpan</Button>
      </form>
    </Panel>
  );
}

export function ArticlesPage({ initialArticleId }: { initialArticleId?: number | "new" } = {}) {
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const [editor, setEditor] = useState<number | "new" | null>(initialArticleId ?? null);
  const [search, setSearch] = useState("");
  const articles = listFrom(useList<Article>(["articles"], "/articles?perPage=100").data);
  const filteredArticles = articles.filter((article) => [article.title, article.category, article.content, (article.relevantLevels ?? []).join(" ")].join(" ").toLowerCase().includes(search.toLowerCase()));
  const publish = useMutation({ mutationFn: (id: number) => apiFetch(`/articles/${id}/publish`, { method: "POST" }), onSuccess: () => { toast.success("Artikel dipublish"); queryClient.invalidateQueries({ queryKey: ["articles"] }); }, onError: (error) => toast.error(error.message) });
  return (
    <div className="grid gap-4">
      {initialArticleId ? <Breadcrumbs items={[{ label: "Parenting", href: "/articles" }, { label: initialArticleId === "new" ? "Artikel baru" : "Edit artikel" }]} /> : null}
      <PageHeader title="Parenting Corner" description="Kelola artikel parenting untuk aplikasi orang tua." icon={<FileText className="h-5 w-5" />}>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <SearchBox value={search} onChange={setSearch} placeholder="Cari parenting, kategori, level" />
          {can("manage_articles") ? <Button onClick={() => setEditor("new")}><Plus className="h-4 w-4" />Artikel baru</Button> : null}
        </div>
      </PageHeader>
      <div className="grid gap-4">{filteredArticles.map((article) => <article key={article.id} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><h2 className="font-display text-xl font-extrabold text-[#0a1f5c]">{article.title}</h2><p className="mt-1 text-sm text-[#64748b]">{article.category} / {article.isPublished ? "Published" : "Draft"}</p><div className="mt-2 flex flex-wrap gap-1.5">{(article.relevantLevels ?? []).map((level) => <span key={level} className="rounded-md border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-[#64748b]">{level}</span>)}</div><p className="mt-2 line-clamp-2 text-sm leading-6 text-[#334155]">{article.content}</p></div>{can("manage_articles") ? <div className="flex shrink-0 flex-wrap gap-2"><Button tone="plain" onClick={() => setEditor(article.id)}><Pencil className="h-4 w-4" />Edit</Button><Button disabled={article.isPublished} onClick={() => publish.mutate(article.id)}>Publish</Button></div> : null}</div></article>)}{filteredArticles.length === 0 ? <Empty text="Belum ada artikel sesuai pencarian." /> : null}</div>
      <Modal open={editor !== null} title={editor === "new" ? "Artikel baru" : "Edit artikel"} description="CRUD artikel dibuka sebagai popup dari daftar." onClose={() => setEditor(null)}>
        <ArticleEditor articleId={typeof editor === "number" ? editor : undefined} onSaved={() => setEditor(null)} />
      </Modal>
    </div>
  );
}

export function ArticleNewPage() {
  return <ArticlesPage initialArticleId="new" />;
}

export function ArticleEditPage({ id }: { id: number }) {
  return <ArticlesPage initialArticleId={id} />;
}

export function FeesPage({ initialGenerateOpen = false }: { initialGenerateOpen?: boolean } = {}) {
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [aging, setAging] = useState("");
  const [detailFee, setDetailFee] = useState<StudentFee | null>(null);
  const [generateOpen, setGenerateOpen] = useState(initialGenerateOpen);
  const [confirmFee, setConfirmFee] = useState<StudentFee | null>(null);
  const [generateForm, setGenerateForm] = useState({ month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()) });
  const [confirmForm, setConfirmForm] = useState({ receivedAmount: "", bankAccountId: "", proofUrl: "", notes: "" });
  const [confirmProof, setConfirmProof] = useState<File[]>([]);
  const feesQuery = useList<StudentFee>(["fees", status, aging], buildQuery("/fees", { status, aging, perPage: 100 }));
  const fees = listFrom(feesQuery.data);
  const summary = useItem<{
    target: number;
    paid: number;
    outstanding: number;
    overdue: number;
    overdueCount: number;
    unpaidCount: number;
    partialCount: number;
    paidCount: number;
    enrollmentSummary?: {
      academicYear?: string | null;
      target: number;
      paid: number;
      outstanding: number;
      count: number;
      paidCount: number;
      partialCount: number;
      unpaidCount: number;
    };
  }>(["fees-summary"], "/fees/summary").data?.data;
  const accounts = listFrom(useList<BankAccount>(["school-accounts", "fees"], "/school-accounts").data);
  const collectionRate = (summary?.target ?? 0) > 0 ? Math.round(((summary?.paid ?? 0) / (summary?.target ?? 1)) * 100) : 0;
  const openInvoiceCount = (summary?.unpaidCount ?? 0) + (summary?.partialCount ?? 0);

  const generate = useMutation({
    mutationFn: () => apiFetch<{ generated: number }>("/fees/generate", { method: "POST", body: { month: Number(generateForm.month), year: Number(generateForm.year) } }),
    onSuccess: (response) => {
      toast.success(`${response.data.generated} invoice dibuat`);
      setGenerateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["fees"] });
      queryClient.invalidateQueries({ queryKey: ["fees-summary"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const confirm = useMutation({
    mutationFn: () => {
      const body = new FormData();
      appendFormValue(body, "receivedAmount", Number(confirmForm.receivedAmount));
      appendFormValue(body, "bankAccountId", confirmForm.bankAccountId ? Number(confirmForm.bankAccountId) : undefined);
      appendFormValue(body, "proofUrl", confirmForm.proofUrl);
      appendFormValue(body, "notes", confirmForm.notes);
      if (confirmProof[0]) body.append("proof", confirmProof[0]);
      return apiFetch(`/fees/${confirmFee?.id}/confirm-payment`, { method: "POST", body });
    },
    onSuccess: () => {
      toast.success("Pembayaran dikonfirmasi");
      setConfirmFee(null);
      setConfirmForm({ receivedAmount: "", bankAccountId: "", proofUrl: "", notes: "" });
      setConfirmProof([]);
      queryClient.invalidateQueries({ queryKey: ["fees"] });
      queryClient.invalidateQueries({ queryKey: ["fees-summary"] });
    },
    onError: (error) => toast.error(error.message),
  });

  function exportCsv() {
    const rows = [
      ["Invoice", "Murid", "Tagihan", "Periode", "Jatuh Tempo", "Total", "Terbayar", "Status"],
      ...fees.map((fee) => [
        fee.invoiceNumber ?? "",
        fee.student?.fullName ?? "",
        fee.feeType?.name ?? "",
        monthName(fee.month, fee.year),
        formatDate(fee.dueDate),
        String(fee.totalBilled),
        String(fee.paidAmount),
        fee.status,
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll("\"", "\"\"")}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "tagihan-spp.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-4">
      <PageHeader title="Keuangan SPP" description="Invoice manual transfer, kode unik, aging, partial payment, dan konfirmasi pembayaran." icon={<Wallet className="h-5 w-5" />}>
        <div className="flex flex-wrap gap-2">
          <Button tone="plain" onClick={exportCsv}><Download className="h-4 w-4" />Export CSV</Button>
          {can("manage_fees") ? <Button onClick={() => setGenerateOpen(true)}><RefreshCw className="h-4 w-4" />Generate</Button> : null}
        </div>
      </PageHeader>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <CompactStatCard label="Target SPP" value={compactMoney(summary?.target)} description="Target bulan ini" borderColor="blue" trend={{ value: `${collectionRate}% sudah terbayar`, positive: collectionRate >= 70 }} />
        <CompactStatCard label="Terbayar" value={compactMoney(summary?.paid)} description={`${summary?.paidCount ?? 0} invoice lunas`} borderColor="emerald" />
        <CompactStatCard label="Belum Dibayar" value={compactMoney(summary?.outstanding)} description={`${openInvoiceCount} invoice unpaid/partial`} borderColor="amber" />
        <CompactStatCard label="Overdue" value={compactMoney(summary?.overdue)} description={`${summary?.overdueCount ?? 0} invoice lewat tempo`} borderColor="rose" />
      </section>

      <Panel title="Daftar tagihan" action={<div className="flex flex-wrap gap-2"><Select label="Status" value={status} onChange={setStatus}><option value="">Semua</option><option value="unpaid">Belum bayar</option><option value="partial">Partial</option><option value="paid">Lunas</option></Select><Select label="Aging" value={aging} onChange={setAging}><option value="">Semua aging</option><option value="overdue">Overdue</option><option value="due_soon">Jatuh tempo 7 hari</option></Select></div>}>
        <div className="grid gap-3">
          {fees.map((fee) => {
            const progress = fee.totalBilled > 0 ? Math.min(100, Math.round((fee.paidAmount / fee.totalBilled) * 100)) : 0;
            const overdue = fee.status !== "paid" && fee.dueDate && new Date(fee.dueDate) < new Date();
            return (
              <article key={fee.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold text-[#0a1f5c]">{fee.student?.fullName ?? "-"} / {fee.feeType?.name ?? "Tagihan"}</h2>
                      <Badge value={fee.status} />
                      {overdue ? <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700">Overdue</span> : null}
                    </div>
                    <p className="mt-1 text-sm text-[#64748b]">{fee.invoiceNumber ?? `INV-${fee.id}`} / {monthName(fee.month, fee.year)} / jatuh tempo {formatDate(fee.dueDate)}</p>
                    <p className="mt-1 text-xs font-semibold text-[#0a1f5c]">Transfer tepat {money(fee.totalBilled)} ke {fee.bankAccount?.bankName ?? "-"} {fee.bankAccount?.accountNumber ?? "-"} a/n {fee.bankAccount?.accountHolder ?? "-"}</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-[#0a1f5c]" style={{ width: `${progress}%` }} /></div>
                    <p className="mt-1 text-xs text-[#64748b]">Terbayar {money(fee.paidAmount)} dari {money(fee.totalBilled)}. Kode unik {String(fee.uniqueCode).padStart(3, "0")}.</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button tone="plain" onClick={() => setDetailFee(fee)}><Eye className="h-4 w-4" />Detail</Button>
                    {can("manage_fees") && fee.status !== "paid" ? <Button onClick={() => { setConfirmFee(fee); setConfirmForm({ receivedAmount: String(Math.max(fee.totalBilled - fee.paidAmount, 0)), bankAccountId: fee.bankAccount?.id ? String(fee.bankAccount.id) : "", proofUrl: "", notes: "" }); }}><Check className="h-4 w-4" />Konfirmasi</Button> : null}
                  </div>
                </div>
              </article>
            );
          })}
          {fees.length === 0 ? <Empty text={feesQuery.isLoading ? "Memuat tagihan." : "Belum ada tagihan."} /> : null}
        </div>
      </Panel>

      <Modal open={generateOpen} title="Generate invoice bulanan" description="Generate idempotent. Periode sama tidak membuat invoice duplikat." onClose={() => setGenerateOpen(false)}>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); generate.mutate(); }}>
          <Input label="Bulan" type="number" value={generateForm.month} onChange={(value) => setGenerateForm({ ...generateForm, month: value })} required />
          <Input label="Tahun" type="number" value={generateForm.year} onChange={(value) => setGenerateForm({ ...generateForm, year: value })} required />
          <div className="md:col-span-2"><Button type="submit" disabled={generate.isPending}><RefreshCw className="h-4 w-4" />Generate invoice</Button></div>
        </form>
      </Modal>

      <Modal open={Boolean(confirmFee)} title="Konfirmasi pembayaran" description="Catat pembayaran masuk. Status otomatis partial atau lunas sesuai nominal terkonfirmasi." onClose={() => setConfirmFee(null)}>
        <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); confirm.mutate(); }}>
          <Input label="Nominal diterima" type="number" value={confirmForm.receivedAmount} onChange={(value) => setConfirmForm({ ...confirmForm, receivedAmount: value })} required />
          <Select label="Rekening sekolah" value={confirmForm.bankAccountId} onChange={(value) => setConfirmForm({ ...confirmForm, bankAccountId: value })}>
            <option value="">Pakai rekening invoice</option>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.bankName} {account.accountNumber}</option>)}
          </Select>
          <FileInput label="Upload bukti bayar" files={confirmProof} onChange={(files) => setConfirmProof(files.slice(0, 1))} accept="image/*,.pdf" />
          <Input label="URL bukti bayar" value={confirmForm.proofUrl} onChange={(value) => setConfirmForm({ ...confirmForm, proofUrl: value })} />
          <Textarea label="Catatan admin" value={confirmForm.notes} onChange={(value) => setConfirmForm({ ...confirmForm, notes: value })} rows={3} />
          <Button type="submit" disabled={confirm.isPending}>Simpan konfirmasi</Button>
        </form>
      </Modal>

      <Modal open={Boolean(detailFee)} title="Detail invoice" description={detailFee?.invoiceNumber ?? `Invoice #${detailFee?.id ?? ""}`} onClose={() => setDetailFee(null)}>
        {detailFee ? <FeeDetailContent fee={detailFee} /> : null}
      </Modal>
    </div>
  );
}

function FeeDetailContent({ fee }: { fee: StudentFee }) {
  const progress = fee.totalBilled > 0 ? Math.min(100, Math.round((fee.paidAmount / fee.totalBilled) * 100)) : 0;
  return (
    <div className="grid gap-3">
      <section className="rounded-lg border border-slate-200 p-3">
        <p className="text-[11px] font-semibold text-[#64748b]">Instruksi transfer</p>
        <p className="font-display mt-0.5 text-xl font-extrabold text-[#0a1f5c]">Transfer tepat {money(fee.totalBilled)}</p>
        <p className="mt-1 text-xs text-[#64748b]">ke {fee.bankAccount?.bankName ?? "-"} {fee.bankAccount?.accountNumber ?? "-"} a/n {fee.bankAccount?.accountHolder ?? "-"}</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-[#0a1f5c]" style={{ width: `${progress}%` }} /></div>
        <p className="mt-1 text-xs text-[#64748b]">Terbayar {money(fee.paidAmount)} dari {money(fee.totalBilled)}. Jatuh tempo {formatDate(fee.dueDate)}.</p>
      </section>
      <section>
        <h3 className="mb-2 text-xs font-bold text-[#0a1f5c]">Riwayat pembayaran</h3>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] uppercase text-[#64748b]"><tr><th className="p-2.5">Nominal</th><th className="p-2.5">Rekening</th><th className="p-2.5">Status</th><th className="p-2.5">Tanggal</th></tr></thead>
            <tbody>
              {(fee.payments ?? []).map((payment) => (
                <tr key={payment.id} className="border-t border-slate-100">
                  <td className="p-2.5 font-semibold text-[#0a1f5c]">{money(payment.confirmedAmount ?? payment.receivedAmount)}</td>
                  <td className="p-2.5 text-[#64748b]">{payment.bankAccount?.bankName ?? "-"}</td>
                  <td className="p-2.5"><Badge value={payment.status} /></td>
                  <td className="p-2.5 text-[#64748b]">{formatDate(payment.confirmedAt ?? payment.rejectedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(fee.payments ?? []).length === 0 ? <div className="p-3"><Empty text="Belum ada payment attempt." /></div> : null}
        </div>
      </section>
    </div>
  );
}

export function FeeGeneratePage() {
  return <><Breadcrumbs items={[{ label: "Keuangan", href: "/fees" }, { label: "Generate" }]} /><FeesPage initialGenerateOpen /></>;
}

export function FeeDetailPage({ id }: { id: number }) {
  const fee = useItem<StudentFee>(["fee", id], `/fees/${id}`, Boolean(id)).data?.data;
  return <div className="grid gap-4"><Breadcrumbs items={[{ label: "Keuangan", href: "/fees" }, { label: fee?.invoiceNumber ?? "Detail tagihan" }]} /><PageHeader title="Detail Tagihan" description={`${fee?.student?.fullName ?? "-"} / ${monthName(fee?.month, fee?.year)}`} icon={<Banknote className="h-5 w-5" />} />{fee ? <FeeDetailContent fee={fee} /> : <Empty text="Memuat detail tagihan." />}</div>;
}

function HealthRow({ icon, label, value, status }: { icon: string; label: string; value: string; status: "Baik" | "Perhatian" | "Kritis" }) {
  const statusClass = status === "Baik"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : status === "Perhatian"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-rose-200 bg-rose-50 text-rose-700";

  return (
    <div className="grid grid-cols-[28px_1fr_auto_auto] items-center gap-2 rounded-lg border border-slate-100 px-3 py-2.5">
      <span className="grid h-7 w-7 place-items-center rounded-md bg-slate-50 text-xs font-extrabold text-[#0a1f5c]">{icon}</span>
      <span className="text-sm font-semibold text-[#0a1f5c]">{label}</span>
      <span className="text-sm font-bold text-[#0a1f5c]">{value}</span>
      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusClass}`}>{status}</span>
    </div>
  );
}

export function FinanceOverviewPage() {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const [period, setPeriod] = useState({ month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()) });
  const [flowRange, setFlowRange] = useState<"threeMonths" | "oneMonth" | "sevenDays" | "oneDay">("oneMonth");
  const overview = useItem<FinanceOverview>(["finance-overview", period], buildQuery("/finance/overview", { month: period.month, year: period.year })).data?.data;
  const [entryOpen, setEntryOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FinanceEntry | null>(null);
  const [entryForm, setEntryForm] = useState({ type: "expense", category: "operational", title: "", amount: "", entryDate: todayInput(), source: "", notes: "" });
  const categoryRows = overview?.categories ?? [];
  const flowTabs = [
    { key: "oneDay", label: "Hari ini" },
    { key: "sevenDays", label: "7 hari" },
    { key: "oneMonth", label: "1 bulan" },
    { key: "threeMonths", label: "3 bulan" },
  ] as const;
  const cashFlowRows = overview?.cashFlow?.[flowRange] ?? [];
  const incomeCompletion = (overview?.targetIncome ?? 0) > 0 ? Math.round(((overview?.cashIn ?? 0) / (overview?.targetIncome ?? 1)) * 100) : 0;
  const expensePressure = (overview?.cashIn ?? 0) > 0 ? Math.round(((overview?.cashOut ?? 0) / (overview?.cashIn ?? 1)) * 100) : 0;
  const flowIn = cashFlowRows.reduce((sum, item) => sum + item.cashIn, 0);
  const flowOut = cashFlowRows.reduce((sum, item) => sum + item.cashOut, 0);
  const flowNet = flowIn - flowOut;
  const compositionRows = [
    { name: "SPP", value: categoryRows.find((item) => item.key === "spp")?.paid ?? 0, color: "#10b981" },
    { name: "Uang Pendaftaran", value: categoryRows.find((item) => item.key === "enrollment")?.paid ?? 0, color: "#2563eb" },
    { name: "Lainnya", value: categoryRows.filter((item) => !["spp", "enrollment"].includes(item.key) && item.type === "income").reduce((sum, item) => sum + Math.max(item.paid, 0), 0), color: "#f59e0b" },
  ].filter((item) => item.value > 0);
  const compositionTotal = compositionRows.reduce((sum, item) => sum + item.value, 0);
  const spp = categoryRows.find((item) => item.key === "spp");
  const sppRatio = (spp?.target ?? 0) > 0 ? Math.round(((spp?.paid ?? 0) / (spp?.target ?? 1)) * 100) : 0;
  const runwayMonths = (overview?.plannedExpense ?? 0) > 0 ? Math.floor((overview?.netCash ?? 0) / (overview?.plannedExpense ?? 1)) : null;

  function openEntry(item?: FinanceEntry) {
    setEditingEntry(item ?? null);
    setEntryForm(item ? {
      type: item.type,
      category: item.category,
      title: item.title,
      amount: String(item.amount),
      entryDate: item.entryDate?.slice(0, 10) ?? todayInput(),
      source: item.source ?? "",
      notes: item.notes ?? "",
    } : { type: "expense", category: "operational", title: "", amount: "", entryDate: todayInput(), source: "", notes: "" });
    setEntryOpen(true);
  }

  const saveEntry = useMutation({
    mutationFn: () => apiFetch(editingEntry ? `/finance/entries/${editingEntry.id}` : "/finance/entries", {
      method: editingEntry ? "PUT" : "POST",
      body: { ...entryForm, amount: Number(entryForm.amount) },
    }),
    onSuccess: () => {
      toast.success("Catatan kas tersimpan");
      setEntryOpen(false);
      queryClient.invalidateQueries({ queryKey: ["finance-overview"] });
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="grid gap-4">
      <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="font-display text-xl font-extrabold text-[#0a1f5c]">Pusat Keuangan</h1>
        <MonthYearNav month={Number(period.month)} year={Number(period.year)} onChange={(month, year) => setPeriod({ month: String(month), year: String(year) })} />
        {can("manage_fees") ? <Button onClick={() => openEntry()}><Plus className="h-4 w-4" />Catatan Kas</Button> : <span />}
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <CompactStatCard label="Uang Masuk" value={compactMoney(overview?.cashIn)} description={`${incomeCompletion}% dari target`} borderColor="emerald" trend={{ value: `Target ${compactMoney(overview?.targetIncome)}`, positive: true }} />
        <CompactStatCard label="Uang Keluar" value={compactMoney(overview?.cashOut)} description={`${expensePressure}% dari masuk`} borderColor="rose" />
        <CompactStatCard label="Saldo" value={compactMoney(overview?.netCash)} description={(overview?.netCash ?? 0) >= 0 ? "Kas positif" : "Kas minus"} borderColor="blue" />
        <CompactStatCard label="Belum Tertagih" value={compactMoney(overview?.outstandingIncome)} description="SPP + pendaftaran" borderColor="amber" />
      </section>

      <Panel
        title="Grafik Arus Kas"
        action={<div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">{flowTabs.map((tab) => <button key={tab.key} type="button" onClick={() => setFlowRange(tab.key)} className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${flowRange === tab.key ? "bg-[#0a1f5c] text-white" : "text-[#0a1f5c] hover:bg-slate-50"}`}>{tab.label}</button>)}</div>}
      >
        <p className="mb-3 text-sm font-semibold text-[#64748b]">
          Masuk <span className="text-emerald-700">{money(flowIn)}</span> <span className="mx-1 text-slate-300">·</span>
          Keluar <span className="text-rose-700">{money(flowOut)}</span> <span className="mx-1 text-slate-300">·</span>
          Net <span className={flowNet >= 0 ? "text-emerald-700" : "text-rose-700"}>{flowNet >= 0 ? "+" : ""}{money(flowNet)}</span>
        </p>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={cashFlowRows}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => `${Math.round(Number(value) / 1000000)}jt`} width={48} />
              <Tooltip formatter={(value, name) => [money(Number(value)), name === "cashIn" ? "Masuk" : "Keluar"]} labelFormatter={(value) => `Tanggal ${value}`} />
              <Area type="monotone" dataKey="cashIn" name="Masuk" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
              <Area type="monotone" dataKey="cashOut" name="Keluar" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <section className="grid gap-3 lg:grid-cols-[0.85fr_1.15fr]">
        <Panel title="Komposisi kas">
          <div className="grid gap-4 sm:grid-cols-[170px_1fr] sm:items-center">
            <div className="h-[170px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie data={compositionRows} dataKey="value" nameKey="name" innerRadius={50} outerRadius={78}>
                    {compositionRows.map((item) => <Cell key={item.name} fill={item.color} />)}
                  </Pie>
                  <Tooltip formatter={(value) => money(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid gap-2">
              {compositionRows.map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2">
                  <span className="flex items-center gap-2 text-xs font-semibold text-[#0a1f5c]"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span>
                  <span className="text-right text-xs font-bold text-[#0a1f5c]">{money(item.value)} <span className="text-[#64748b]">({compositionTotal ? Math.round((item.value / compositionTotal) * 100) : 0}%)</span></span>
                </div>
              ))}
              {compositionRows.length === 0 ? <Empty text="Belum ada kas masuk periode ini." /> : null}
            </div>
          </div>
        </Panel>
        <Panel title="Kesehatan kas bulan ini">
          <div className="grid gap-2">
            <HealthRow icon="%" label="Rasio koleksi SPP" value={`${sppRatio}%`} status={sppRatio >= 80 ? "Baik" : sppRatio >= 50 ? "Perhatian" : "Kritis"} />
            <HealthRow icon="!" label="Total tunggakan" value={money(overview?.outstandingIncome)} status={(overview?.outstandingIncome ?? 0) <= 0 ? "Baik" : "Perhatian"} />
            <HealthRow icon="R" label="Runway kas" value={runwayMonths === null ? "Belum ada beban tetap" : `${runwayMonths} bulan`} status={runwayMonths === null || runwayMonths >= 3 ? "Baik" : runwayMonths >= 1 ? "Perhatian" : "Kritis"} />
            <HealthRow icon="+" label="Target masuk" value={money(overview?.targetIncome)} status={incomeCompletion >= 80 ? "Baik" : "Perhatian"} />
            <HealthRow icon="-" label="Rencana keluar" value={money(overview?.plannedExpense)} status={(overview?.plannedExpense ?? 0) <= (overview?.cashIn ?? 0) ? "Baik" : "Perhatian"} />
          </div>
        </Panel>
      </section>

      <Modal open={entryOpen} title={editingEntry ? "Edit catatan kas" : "Catatan kas baru"} description="Pakai untuk operasional, donasi, aset, maintenance, atau transaksi lain di luar SPP/pendaftaran." onClose={() => setEntryOpen(false)}>
        <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); saveEntry.mutate(); }}>
          <Select label="Tipe" value={entryForm.type} onChange={(value) => setEntryForm({ ...entryForm, type: value })}>
            <option value="income">Pemasukan</option>
            <option value="expense">Pengeluaran</option>
          </Select>
          <Select label="Kategori" value={entryForm.category} onChange={(value) => setEntryForm({ ...entryForm, category: value })}>
            <option value="operational">Operasional</option>
            <option value="donation">Donasi</option>
            <option value="asset">Aset</option>
            <option value="maintenance">Maintenance</option>
            <option value="other">Lainnya</option>
          </Select>
          <Input label="Judul" value={entryForm.title} onChange={(value) => setEntryForm({ ...entryForm, title: value })} required />
          <Input label="Nominal" type="number" value={entryForm.amount} onChange={(value) => setEntryForm({ ...entryForm, amount: value })} required />
          <Input label="Tanggal" type="date" value={entryForm.entryDate} onChange={(value) => setEntryForm({ ...entryForm, entryDate: value })} required />
          <Input label="Sumber/vendor" value={entryForm.source} onChange={(value) => setEntryForm({ ...entryForm, source: value })} />
          <Textarea label="Catatan" value={entryForm.notes} onChange={(value) => setEntryForm({ ...entryForm, notes: value })} rows={3} />
          <Button type="submit" disabled={saveEntry.isPending}><Save className="h-4 w-4" />Simpan</Button>
        </form>
      </Modal>
    </div>
  );
}

function PayrollStatusBadge({ status }: { status: TeacherPayroll["status"] }) {
  const cls = status === "paid"
    ? "border-emerald-600 bg-emerald-600 text-white"
    : status === "approved"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : status === "draft"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-slate-50 text-slate-700";

  return <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10.5px] font-bold ${cls}`}>{label(status)}</span>;
}

export function TeacherPayrollsPage() {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const [filters, setFilters] = useState({ month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()), status: "" });
  const [search, setSearch] = useState("");
  const allPayrolls = listFrom(useList<TeacherPayroll>(["teacher-payrolls", filters.month, filters.year], buildQuery("/finance/payrolls", { month: filters.month, year: filters.year, perPage: 100 })).data);
  const payrolls = allPayrolls.filter((item) => {
    const statusMatch = !filters.status || item.status === filters.status;
    const searchMatch = [item.teacher?.name ?? "", item.teacher?.email ?? ""].join(" ").toLowerCase().includes(search.toLowerCase());
    return statusMatch && searchMatch;
  });
  const teachers = listFrom(useList<User>(["payroll-teachers"], "/finance/payroll-teachers").data);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TeacherPayroll | null>(null);
  const [form, setForm] = useState({ teacherId: "", month: filters.month, year: filters.year, baseSalary: "", incentiveAmount: "0", deductionAmount: "0", status: "draft", paidAt: todayInput(), notes: "" });
  const total = allPayrolls.reduce((sum, item) => sum + item.totalAmount, 0);
  const paid = allPayrolls.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.totalAmount, 0);
  const approved = allPayrolls.filter((item) => item.status === "approved").reduce((sum, item) => sum + item.totalAmount, 0);
  const draftCount = allPayrolls.filter((item) => item.status === "draft").length;
  const formTotal = Math.max(Number(form.baseSalary || 0) + Number(form.incentiveAmount || 0) - Number(form.deductionAmount || 0), 0);
  const statusTabs = [
    { value: "", label: "Semua" },
    { value: "draft", label: "Draft" },
    { value: "approved", label: "Disetujui" },
    { value: "paid", label: "Dibayar" },
  ];

  function openPayroll(item?: TeacherPayroll) {
    setEditing(item ?? null);
    setForm(item ? {
      teacherId: String(item.teacher?.id ?? item.teacherId ?? ""),
      month: String(item.month),
      year: String(item.year),
      baseSalary: String(item.baseSalary),
      incentiveAmount: String(item.incentiveAmount),
      deductionAmount: String(item.deductionAmount),
      status: item.status,
      paidAt: item.paidAt?.slice(0, 10) ?? todayInput(),
      notes: item.notes ?? "",
    } : { teacherId: "", month: filters.month, year: filters.year, baseSalary: "", incentiveAmount: "0", deductionAmount: "0", status: "draft", paidAt: todayInput(), notes: "" });
    setFormOpen(true);
  }

  const savePayroll = useMutation({
    mutationFn: () => apiFetch(editing ? `/finance/payrolls/${editing.id}` : "/finance/payrolls", {
      method: editing ? "PUT" : "POST",
      body: {
        teacherId: Number(form.teacherId),
        month: Number(form.month),
        year: Number(form.year),
        baseSalary: Number(form.baseSalary),
        incentiveAmount: Number(form.incentiveAmount),
        deductionAmount: Number(form.deductionAmount),
        status: form.status,
        paidAt: form.status === "paid" ? form.paidAt : undefined,
        notes: form.notes,
      },
    }),
    onSuccess: () => {
      toast.success("Gaji guru tersimpan");
      setFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ["teacher-payrolls"] });
      queryClient.invalidateQueries({ queryKey: ["finance-overview"] });
    },
    onError: (error) => toast.error(error.message),
  });
  const changeStatus = useMutation({
    mutationFn: ({ item, status }: { item: TeacherPayroll; status: TeacherPayroll["status"] }) => apiFetch(`/finance/payrolls/${item.id}`, {
      method: "PUT",
      body: {
        teacherId: item.teacher?.id ?? item.teacherId,
        month: item.month,
        year: item.year,
        baseSalary: item.baseSalary,
        incentiveAmount: item.incentiveAmount,
        deductionAmount: item.deductionAmount,
        status,
        paidAt: status === "paid" ? todayInput() : undefined,
        notes: item.notes ?? "",
      },
    }),
    onSuccess: () => {
      toast.success("Status gaji diperbarui");
      queryClient.invalidateQueries({ queryKey: ["teacher-payrolls"] });
      queryClient.invalidateQueries({ queryKey: ["finance-overview"] });
    },
    onError: (error) => toast.error(error.message),
  });

  function exportPayrollCsv() {
    const rows = [
      ["Guru", "Bulan", "Gaji Pokok", "Insentif", "Potongan", "Total", "Status"],
      ...payrolls.map((item) => [
        item.teacher?.name ?? "",
        monthName(item.month, item.year),
        String(item.baseSalary),
        String(item.incentiveAmount),
        String(item.deductionAmount),
        String(item.totalAmount),
        label(item.status),
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll("\"", "\"\"")}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `gaji-guru-${filters.month}-${filters.year}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-4">
      <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 xl:flex-row xl:items-center xl:justify-between">
        <h1 className="font-display text-xl font-extrabold text-[#0a1f5c]">Gaji Guru</h1>
        <MonthYearNav month={Number(filters.month)} year={Number(filters.year)} onChange={(month, year) => setFilters({ ...filters, month: String(month), year: String(year) })} />
        <div className="flex items-center gap-2">
          <div className="group relative">
            <button type="button" className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-sm font-extrabold text-[#0a1f5c]" aria-label="Alur gaji">i</button>
            <div className="invisible absolute right-0 top-10 z-20 w-72 rounded-lg border border-slate-200 bg-white p-3 text-xs leading-5 text-[#334155] opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100">
              1. Draft {"->"} catat nominal gaji<br />
              2. Disetujui {"->"} angka sudah dicek, siap dibayar<br />
              3. Dibayar {"->"} isi tanggal bayar, masuk laporan kas
            </div>
          </div>
          {can("manage_fees") ? <Button onClick={() => openPayroll()}><Plus className="h-4 w-4" />Catat Gaji Guru</Button> : null}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1">
          {statusTabs.map((tab) => (
            <button key={tab.value} type="button" onClick={() => setFilters({ ...filters, status: tab.value })} className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${filters.status === tab.value ? "bg-[#0a1f5c] text-white" : "text-[#0a1f5c] hover:bg-slate-50"}`}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SearchBox value={search} onChange={setSearch} placeholder="Cari nama guru..." />
          <Button tone="plain" onClick={exportPayrollCsv}><Download className="h-4 w-4" />Export</Button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <CompactStatCard label="Harus Dibayar" value={compactMoney(total)} description="Semua status" borderColor="rose" />
        <CompactStatCard label="Siap Dibayar" value={compactMoney(approved)} description="Status disetujui" borderColor="blue" />
        <CompactStatCard label="Sudah Dibayar" value={compactMoney(paid)} description="Masuk kas keluar" borderColor="emerald" />
        <CompactStatCard label="Masih Draft" value={`${draftCount} data`} description="Belum disetujui" borderColor="amber" />
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex min-h-11 items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
          <h2 className="text-[13px] font-bold text-[#0a1f5c]">Tabel Daftar Gaji</h2>
          <span className="text-xs font-semibold text-[#64748b]">{payrolls.length} data</span>
        </div>
        {payrolls.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-[#64748b]">
                <tr>
                  <th className="px-4 py-3">Guru</th>
                  <th className="px-4 py-3">Bulan</th>
                  <th className="px-4 py-3 text-right">Gaji Pokok</th>
                  <th className="px-4 py-3 text-right">Insentif</th>
                  <th className="px-4 py-3 text-right">Potongan</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {payrolls.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 transition hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-semibold text-[#0a1f5c]">{item.teacher?.name ?? "Guru"}</td>
                    <td className="px-4 py-3 text-[#64748b]">{monthName(item.month, item.year)}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm">{money(item.baseSalary)}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm">{money(item.incentiveAmount)}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm">{money(item.deductionAmount)}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-bold text-[#0a1f5c]">{money(item.totalAmount)}</td>
                    <td className="px-4 py-3"><PayrollStatusBadge status={item.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button tone="plain" onClick={() => openPayroll(item)}><Eye className="h-4 w-4" />Detail</Button>
                        {can("manage_fees") && item.status === "draft" ? <Button tone="plain" onClick={() => openPayroll(item)}><Pencil className="h-4 w-4" />Edit</Button> : null}
                        {can("manage_fees") && item.status === "draft" ? <Button onClick={() => changeStatus.mutate({ item, status: "approved" })}>Setujui</Button> : null}
                        {can("manage_fees") && item.status === "approved" ? <Button onClick={() => changeStatus.mutate({ item, status: "paid" })}>Dibayar</Button> : null}
                        {can("manage_fees") && item.status === "approved" ? <Button tone="plain" onClick={() => changeStatus.mutate({ item, status: "draft" })}>Batalkan</Button> : null}
                        {item.status === "paid" ? <Button tone="plain" onClick={() => toast.info("Slip gaji belum tersedia")}><Download className="h-4 w-4" />Slip</Button> : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid place-items-center px-4 py-12 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-slate-100 text-[#64748b]"><Wallet className="h-6 w-6" /></div>
            <h3 className="mt-3 font-bold text-[#0a1f5c]">Belum ada data gaji {monthName(Number(filters.month), Number(filters.year))}</h3>
            <p className="mt-1 text-sm text-[#64748b]">Mulai catat gaji guru untuk periode ini.</p>
            {can("manage_fees") ? <div className="mt-4"><Button onClick={() => openPayroll()}><Plus className="h-4 w-4" />Catat Gaji Guru</Button></div> : null}
          </div>
        )}
      </section>

      <Modal open={formOpen} title={editing ? "Edit gaji guru" : "Catat gaji guru"} description="Total dibayar = gaji pokok + insentif - potongan. Pilih status dibayar hanya jika uang sudah keluar." onClose={() => setFormOpen(false)}>
        <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); savePayroll.mutate(); }}>
          <Select label="Guru" value={form.teacherId} onChange={(value) => setForm({ ...form, teacherId: value })} required>
            <option value="">Pilih guru</option>
            {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
          </Select>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Bulan" type="number" value={form.month} onChange={(value) => setForm({ ...form, month: value })} required />
            <Input label="Tahun" type="number" value={form.year} onChange={(value) => setForm({ ...form, year: value })} required />
          </div>
          <Input label="Gaji pokok" type="number" value={form.baseSalary} onChange={(value) => setForm({ ...form, baseSalary: value })} required />
          <Input label="Tambahan / insentif" type="number" value={form.incentiveAmount} onChange={(value) => setForm({ ...form, incentiveAmount: value })} />
          <Input label="Potongan" type="number" value={form.deductionAmount} onChange={(value) => setForm({ ...form, deductionAmount: value })} />
          <div className="rounded-lg border border-[#0a1f5c]/15 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-[#64748b]">Total yang akan dicatat</p>
            <p className="font-display mt-1 text-2xl font-extrabold text-[#0a1f5c]">{money(formTotal)}</p>
          </div>
          <Select label="Status" value={form.status} onChange={(value) => setForm({ ...form, status: value })}>
            <option value="draft">Draft - masih disusun</option>
            <option value="approved">Disetujui - siap dibayar</option>
            <option value="paid">Dibayar - uang sudah keluar</option>
            <option value="cancelled">Batal</option>
          </Select>
          {form.status === "paid" ? <Input label="Tanggal bayar" type="date" value={form.paidAt} onChange={(value) => setForm({ ...form, paidAt: value })} /> : null}
          <Textarea label="Catatan" value={form.notes} onChange={(value) => setForm({ ...form, notes: value })} rows={3} />
          <Button type="submit" disabled={savePayroll.isPending}><Save className="h-4 w-4" />Simpan</Button>
        </form>
      </Modal>
    </div>
  );
}

export function FinanceSettingsPage() {
  const rules = [
    ["Kode unik transfer", "Aktif untuk invoice SPP agar nominal mudah dicocokkan."],
    ["Audit sumber transaksi", "SPP, uang pendaftaran, kas manual, dan gaji guru wajib punya sumber."],
    ["Konfirmasi pembayaran", "Pembayaran baru masuk Pusat Keuangan setelah dikonfirmasi admin."],
    ["Kas manual", "Pengeluaran/pemasukan manual wajib kategori, nominal, tanggal, dan judul."],
  ];
  return (
    <div className="grid gap-4">
      <Breadcrumbs items={[{ label: "Keuangan", href: "/fees" }, { label: "Pengaturan Keuangan" }]} />
      <PageHeader title="Pengaturan Keuangan" description="Pengaturan general tagihan, rekening, dan aturan finance." icon={<Wallet className="h-5 w-5" />}>
        <p className="text-xs font-semibold text-[#64748b]">SPP mengikuti program murid dan kelas aktif dari data siswa.</p>
      </PageHeader>
      <FeeTypesPage embedded />
      <BankAccountsPage embedded />
      <Panel title="Aturan sistem keuangan">
        <p className="mb-3 text-sm text-[#64748b]">Ringkasan kontrol produksi supaya data pusat keuangan tetap konsisten.</p>
        <div className="grid gap-3 md:grid-cols-2">
          {rules.map(([title, description]) => (
            <div key={title} className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="font-bold text-[#0a1f5c]">{title}</p>
              <p className="mt-1 text-xs leading-5 text-[#64748b]">{description}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LegacyFeesPage() {
  const { can } = usePermissions();
  const fees = listFrom(useList<StudentFee>(["fees"], "/fees?perPage=100").data);
  const summary = useItem<{ target: number; paid: number; unpaidCount: number; partialCount: number; paidCount: number }>(["fees-summary"], "/fees/summary").data?.data;
  return (
    <div className="grid gap-4">
      <PageHeader title="Keuangan SPP" description="Pantau tagihan, kode unik transfer, dan konfirmasi pembayaran." icon={<Wallet className="h-5 w-5" />}>{can("manage_fees") ? <Link className="madani-button bg-[#0a1f5c] text-white" href="/fees/generate"><RefreshCw className="h-4 w-4" />Generate</Link> : null}</PageHeader>
      <div className="grid gap-3 md:grid-cols-3"><Panel title="Target bulan ini"><p className="font-display text-3xl font-extrabold text-[#0a1f5c]">{money(summary?.target)}</p></Panel><Panel title="Terbayar"><p className="font-display text-3xl font-extrabold text-emerald-700">{money(summary?.paid)}</p></Panel><Panel title="Status"><p className="text-sm text-[#64748b]">Lunas {summary?.paidCount ?? 0} / Partial {summary?.partialCount ?? 0} / Belum {summary?.unpaidCount ?? 0}</p></Panel></div>
      <Panel title="Daftar tagihan">
        <div className="grid gap-3">{fees.map((fee) => <Link key={fee.id} href={`/fees/${fee.id}`} className="rounded-2xl border border-slate-200 p-4 hover:border-[#0a1f5c]/30"><div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><div><h2 className="font-bold text-[#0a1f5c]">{fee.student?.fullName ?? "-"} / {fee.feeType?.name ?? "Tagihan"}</h2><p className="text-sm text-[#64748b]">{monthName(fee.month, fee.year)} / kode {String(fee.uniqueCode).padStart(3, "0")}</p></div><div className="text-left md:text-right"><p className="font-display text-xl font-extrabold text-[#0a1f5c]">{money(fee.totalBilled)}</p><Badge value={fee.status} /></div></div></Link>)}{fees.length === 0 ? <Empty text="Belum ada tagihan." /> : null}</div>
      </Panel>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LegacyFeeGeneratePage() {
  const router = useRouter();
  const [form, setForm] = useState({ month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()) });
  const generate = useMutation({ mutationFn: () => apiFetch<{ generated: number }>("/fees/generate", { method: "POST", body: { month: Number(form.month), year: Number(form.year) } }), onSuccess: (response) => { toast.success(`${response.data.generated} tagihan dibuat`); router.push("/fees"); }, onError: (error) => toast.error(error.message) });
  return <div className="grid gap-4"><PageHeader title="Generate Tagihan" description="Buat tagihan SPP bulanan untuk semua murid aktif." icon={<RefreshCw className="h-5 w-5" />} /><Panel title="Periode"><form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); generate.mutate(); }}><Input label="Bulan" type="number" value={form.month} onChange={(value) => setForm({ ...form, month: value })} required /><Input label="Tahun" type="number" value={form.year} onChange={(value) => setForm({ ...form, year: value })} required /><div className="md:col-span-2"><Button type="submit" disabled={generate.isPending}><RefreshCw className="h-4 w-4" />Generate</Button></div></form></Panel></div>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LegacyFeeDetailPage({ id }: { id: number }) {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const fee = useItem<StudentFee>(["fee", id], `/fees/${id}`, Boolean(id)).data?.data;
  const [receivedAmount, setReceivedAmount] = useState("");
  const confirm = useMutation({ mutationFn: () => apiFetch(`/fees/${id}/confirm-payment`, { method: "POST", body: { receivedAmount: Number(receivedAmount) } }), onSuccess: () => { toast.success("Pembayaran dikonfirmasi"); queryClient.invalidateQueries({ queryKey: ["fee", id] }); }, onError: (error) => toast.error(error.message) });
  const progress = fee ? Math.min(100, Math.round((fee.paidAmount / fee.totalBilled) * 100)) : 0;
  return <div className="grid gap-4"><PageHeader title="Detail Tagihan" description={`${fee?.student?.fullName ?? "-"} / ${monthName(fee?.month, fee?.year)}`} icon={<Banknote className="h-5 w-5" />} /><Panel title="Instruksi transfer"><p className="font-display text-3xl font-extrabold text-[#0a1f5c]">Transfer tepat {money(fee?.totalBilled)}</p><p className="mt-2 text-sm text-[#64748b]">ke {fee?.bankAccount?.bankName ?? "-"} {fee?.bankAccount?.accountNumber ?? "-"} a/n {fee?.bankAccount?.accountHolder ?? "-"}</p><div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-[#0a1f5c]" style={{ width: `${progress}%` }} /></div><p className="mt-2 text-sm text-[#64748b]">Terbayar {money(fee?.paidAmount)} dari {money(fee?.totalBilled)}</p><Badge value={fee?.status} /></Panel>{can("manage_fees") ? <Panel title="Konfirmasi pembayaran"><form className="flex flex-col gap-3 sm:flex-row" onSubmit={(event) => { event.preventDefault(); confirm.mutate(); }}><Input label="Nominal diterima" type="number" value={receivedAmount} onChange={setReceivedAmount} required /><div className="self-end"><Button type="submit" disabled={confirm.isPending}>Konfirmasi</Button></div></form></Panel> : null}</div>;
}

export function FeeTypesPage({ embedded = false }: { embedded?: boolean } = {}) {
  const queryClient = useQueryClient();
  const items = listFrom(useList<FeeType>(["fee-types"], "/fee-types").data);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FeeType | null>(null);
  const [form, setForm] = useState({ name: "", amount: "", dueDay: "10", programScope: "all", isRecurring: true, isActive: true });
  function openCreate() {
    setEditing(null);
    setForm({ name: "", amount: "", dueDay: "10", programScope: "all", isRecurring: true, isActive: true });
    setFormOpen(true);
  }
  function openEdit(item: FeeType) {
    setEditing(item);
    setForm({ name: item.name, amount: String(item.amount), dueDay: String(item.dueDay), programScope: feeScopeFromItem(item), isRecurring: item.isRecurring, isActive: item.isActive });
    setFormOpen(true);
  }
  const save = useMutation({
    mutationFn: () => {
      const scope = feeScope(form.programScope);
      return apiFetch(editing ? `/fee-types/${editing.id}` : "/fee-types", {
        method: editing ? "PUT" : "POST",
        body: {
          name: form.name,
          amount: Number(form.amount),
          dueDay: Number(form.dueDay),
          applicableLevels: scope.levels,
          applicablePrograms: scope.programs,
          isRecurring: form.isRecurring,
          isActive: form.isActive,
        },
      });
    },
    onSuccess: () => { toast.success("Jenis tagihan tersimpan"); setFormOpen(false); queryClient.invalidateQueries({ queryKey: ["fee-types"] }); },
    onError: (error) => toast.error(error.message),
  });
  const currentScope = feeScope(form.programScope);
  return (
    <div className="grid gap-4">
      {!embedded ? <Breadcrumbs items={[{ label: "Keuangan", href: "/fees" }, { label: "Jenis Tagihan" }]} /> : null}
      {!embedded ? <PageHeader title="Jenis Tagihan" description="Kelola nominal, program, dan status recurring." icon={<Wallet className="h-5 w-5" />}>
        <Button onClick={openCreate}><Plus className="h-4 w-4" />Jenis baru</Button>
      </PageHeader> : null}
      {embedded ? <div className="flex justify-end"><Button onClick={openCreate}><Plus className="h-4 w-4" />Jenis baru</Button></div> : null}
      <Panel title="Daftar jenis">
        <div className="grid gap-3">
          {items.map((item) => {
            const programs = (item.applicablePrograms ?? []).map((value) => feeScope(value).label).join(", ") || "Semua program";
            const itemLevels = Array.from(new Set((item.applicableLevels ?? []).map((value) => normalizeLevel(value)))).join(", ") || "Semua kelas";
            return (
              <article key={item.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-bold text-[#0a1f5c]">{item.name}</p>
                  <p className="text-sm text-[#64748b]">Jatuh tempo tanggal {item.dueDay} / {programs} / {itemLevels}</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-display text-xl font-extrabold text-[#0a1f5c]">{money(item.amount)}</p>
                  <Button tone="plain" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" />Edit</Button>
                </div>
              </article>
            );
          })}
          {items.length === 0 ? <Empty text="Belum ada jenis tagihan." /> : null}
        </div>
      </Panel>
      <Modal open={formOpen} title={editing ? "Edit jenis tagihan" : "Jenis tagihan baru"} description="Level berlaku otomatis dari program murid." onClose={() => setFormOpen(false)}>
        <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
          <Input label="Nama" value={form.name} onChange={(value) => setForm({ ...form, name: value })} required />
          <Input label="Nominal" type="number" value={form.amount} onChange={(value) => setForm({ ...form, amount: value })} required />
          <Input label="Tanggal jatuh tempo" type="number" value={form.dueDay} onChange={(value) => setForm({ ...form, dueDay: value })} required />
          <Select label="Program berlaku" value={form.programScope} onChange={(value) => setForm({ ...form, programScope: value })}>
            {feeProgramScopes.map((scope) => <option key={scope.value} value={scope.value}>{scope.label}</option>)}
          </Select>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-[#64748b]">
            Level berlaku: {currentScope.levels.join(", ")}
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-[#0a1f5c]"><input type="checkbox" checked={form.isRecurring} onChange={(event) => setForm({ ...form, isRecurring: event.target.checked })} />Recurring bulanan</label>
          <label className="flex items-center gap-2 text-xs font-semibold text-[#0a1f5c]"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />Aktif</label>
          <Button type="submit" disabled={save.isPending}><Save className="h-4 w-4" />Simpan</Button>
        </form>
      </Modal>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LegacyFeeTypesPage() {
  const queryClient = useQueryClient();
  const items = listFrom(useList<FeeType>(["fee-types"], "/fee-types").data);
  const [form, setForm] = useState({ name: "", amount: "", dueDay: "10", applicableLevels: levels.join("\n") });
  const save = useMutation({ mutationFn: () => apiFetch("/fee-types", { method: "POST", body: { name: form.name, amount: Number(form.amount), dueDay: Number(form.dueDay), applicableLevels: lines(form.applicableLevels) } }), onSuccess: () => { toast.success("Jenis tagihan tersimpan"); setForm({ name: "", amount: "", dueDay: "10", applicableLevels: levels.join("\n") }); queryClient.invalidateQueries({ queryKey: ["fee-types"] }); }, onError: (error) => toast.error(error.message) });
  return <div className="grid gap-4"><PageHeader title="Jenis Tagihan" description="Kelola nominal dan level tagihan." icon={<Wallet className="h-5 w-5" />} /><Panel title="Tambah jenis"><form className="grid gap-3 md:grid-cols-3" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}><Input label="Nama" value={form.name} onChange={(value) => setForm({ ...form, name: value })} required /><Input label="Nominal" type="number" value={form.amount} onChange={(value) => setForm({ ...form, amount: value })} required /><Input label="Tanggal jatuh tempo" type="number" value={form.dueDay} onChange={(value) => setForm({ ...form, dueDay: value })} required /><div className="md:col-span-3"><Textarea label="Level berlaku" value={form.applicableLevels} onChange={(value) => setForm({ ...form, applicableLevels: value })} rows={3} /></div><div className="md:col-span-3"><Button type="submit" disabled={save.isPending}><Plus className="h-4 w-4" />Tambah</Button></div></form></Panel><Panel title="Daftar jenis">{items.map((item) => <div key={item.id} className="flex items-center justify-between border-b border-slate-100 py-3 last:border-b-0"><div><p className="font-bold text-[#0a1f5c]">{item.name}</p><p className="text-sm text-[#64748b]">Jatuh tempo tanggal {item.dueDay}</p></div><p className="font-display text-xl font-extrabold text-[#0a1f5c]">{money(item.amount)}</p></div>)}</Panel></div>;
}

export function BankAccountsPage({ embedded = false }: { embedded?: boolean } = {}) {
  const queryClient = useQueryClient();
  const items = listFrom(useList<BankAccount>(["school-accounts"], "/school-accounts").data);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [form, setForm] = useState({ bankName: "", accountNumber: "", accountHolder: "", isActive: true });
  function openCreate() {
    setEditing(null);
    setForm({ bankName: "", accountNumber: "", accountHolder: "", isActive: true });
    setFormOpen(true);
  }
  function openEdit(item: BankAccount) {
    setEditing(item);
    setForm({ bankName: item.bankName, accountNumber: item.accountNumber, accountHolder: item.accountHolder, isActive: item.isActive });
    setFormOpen(true);
  }
  const save = useMutation({
    mutationFn: () => apiFetch(editing ? `/school-accounts/${editing.id}` : "/school-accounts", { method: editing ? "PUT" : "POST", body: form }),
    onSuccess: () => { toast.success("Rekening tersimpan"); setFormOpen(false); queryClient.invalidateQueries({ queryKey: ["school-accounts"] }); },
    onError: (error) => toast.error(error.message),
  });
  return (
    <div className="grid gap-4">
      {!embedded ? <Breadcrumbs items={[{ label: "Keuangan", href: "/fees" }, { label: "Rekening Sekolah" }]} /> : null}
      {!embedded ? <PageHeader title="Rekening Sekolah" description="Kelola rekening tujuan transfer SPP. CRUD memakai popup." icon={<Banknote className="h-5 w-5" />}>
        <Button onClick={openCreate}><Plus className="h-4 w-4" />Rekening baru</Button>
      </PageHeader> : null}
      {embedded ? <div className="flex justify-end"><Button onClick={openCreate}><Plus className="h-4 w-4" />Rekening baru</Button></div> : null}
      <Panel title="Daftar rekening">
        <div className="grid gap-3">
          {items.map((item) => <article key={item.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"><div><p className="font-bold text-[#0a1f5c]">{item.bankName} {item.accountNumber}</p><p className="text-sm text-[#64748b]">a/n {item.accountHolder}</p></div><div className="flex items-center gap-2"><Badge value={item.isActive ? "paid" : "cancelled"} /><Button tone="plain" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" />Edit</Button></div></article>)}
          {items.length === 0 ? <Empty text="Belum ada rekening sekolah." /> : null}
        </div>
      </Panel>
      <Modal open={formOpen} title={editing ? "Edit rekening" : "Rekening baru"} description="Rekening aktif dipakai sebagai tujuan transfer invoice baru." onClose={() => setFormOpen(false)}>
        <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
          <Input label="Bank" value={form.bankName} onChange={(value) => setForm({ ...form, bankName: value })} required />
          <Input label="No rekening" value={form.accountNumber} onChange={(value) => setForm({ ...form, accountNumber: value })} required />
          <Input label="Pemilik" value={form.accountHolder} onChange={(value) => setForm({ ...form, accountHolder: value })} required />
          <label className="flex items-center gap-2 text-xs font-semibold text-[#0a1f5c]"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />Aktif</label>
          <Button type="submit" disabled={save.isPending}><Save className="h-4 w-4" />Simpan</Button>
        </form>
      </Modal>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LegacyBankAccountsPage() {
  const queryClient = useQueryClient();
  const items = listFrom(useList<BankAccount>(["school-accounts"], "/school-accounts").data);
  const [form, setForm] = useState({ bankName: "", accountNumber: "", accountHolder: "" });
  const save = useMutation({ mutationFn: () => apiFetch("/school-accounts", { method: "POST", body: { ...form, isActive: true } }), onSuccess: () => { toast.success("Rekening tersimpan"); setForm({ bankName: "", accountNumber: "", accountHolder: "" }); queryClient.invalidateQueries({ queryKey: ["school-accounts"] }); }, onError: (error) => toast.error(error.message) });
  return <div className="grid gap-4"><PageHeader title="Rekening Sekolah" description="Kelola rekening tujuan transfer SPP." icon={<Banknote className="h-5 w-5" />} /><Panel title="Tambah rekening"><form className="grid gap-3 md:grid-cols-3" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}><Input label="Bank" value={form.bankName} onChange={(value) => setForm({ ...form, bankName: value })} required /><Input label="No rekening" value={form.accountNumber} onChange={(value) => setForm({ ...form, accountNumber: value })} required /><Input label="Pemilik" value={form.accountHolder} onChange={(value) => setForm({ ...form, accountHolder: value })} required /><div className="md:col-span-3"><Button type="submit" disabled={save.isPending}><Plus className="h-4 w-4" />Tambah</Button></div></form></Panel><Panel title="Daftar rekening">{items.map((item) => <div key={item.id} className="flex items-center justify-between border-b border-slate-100 py-3 last:border-b-0"><div><p className="font-bold text-[#0a1f5c]">{item.bankName} {item.accountNumber}</p><p className="text-sm text-[#64748b]">a/n {item.accountHolder}</p></div><Badge value={item.isActive ? "paid" : "cancelled"} /></div>)}</Panel></div>;
}
export function AiChatHistoryPage() {
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ userId: "", studentId: "", date: "" });
  const [search, setSearch] = useState("");
  const histories = listFrom(useList<AiHistory>(["ai-histories", filters], buildQuery("/ai/chat/histories", { user_id: filters.userId, student_id: filters.studentId, date: filters.date, perPage: 100 })).data);
  const filteredHistories = histories.filter((item) => [item.user?.name ?? "", item.student?.fullName ?? "", item.role, item.message].join(" ").toLowerCase().includes(search.toLowerCase()));
  const chatRooms = Array.from(filteredHistories.reduce((map, item) => {
    const key = `${item.user?.id ?? "u"}-${item.student?.id ?? "s"}`;
    const room = map.get(key) ?? { key, user: item.user, student: item.student, latestAt: item.createdAt ?? "", latestMessage: item.message, count: 0, tokens: 0 };
    room.count += 1;
    room.tokens += item.tokensUsed ?? 0;
    if (!room.latestAt || new Date(item.createdAt ?? 0).getTime() > new Date(room.latestAt).getTime()) {
      room.latestAt = item.createdAt ?? "";
      room.latestMessage = item.message;
    }
    map.set(key, room);
    return map;
  }, new Map<string, { key: string; user?: User | null; student?: Student | null; latestAt: string; latestMessage: string; count: number; tokens: number }>()).values()).sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime());
  const usage = useItem<AiUsage>(["ai-usage"], "/ai/chat/usage").data?.data;
  const globalRequests = usage?.global.dailyRequests ?? 1500;
  const globalTokensPerMinute = usage?.global.tokensPerMinute ?? 800000;
  const parentDailyLimit = usage?.users.find((row) => row.quota.parentDailyRequestLimit)?.quota.parentDailyRequestLimit;
  const remove = useMutation({ mutationFn: (id: number) => apiFetch(`/ai/chat/histories/${id}`, { method: "DELETE" }), onSuccess: () => { toast.success("Riwayat AI dihapus"); queryClient.invalidateQueries({ queryKey: ["ai-histories"] }); }, onError: (error) => toast.error(error.message) });

  function exportCsv() {
    const rows = [["Tanggal", "User", "Murid", "Role", "Token", "Pesan"], ...filteredHistories.map((item) => [formatDate(item.createdAt), item.user?.name ?? "", item.student?.fullName ?? "", item.role, String(item.tokensUsed ?? ""), item.message])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll("\"", "\"\"")}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ai-chat-history.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-4">
      <PageHeader title="Chat Internal" description="Pantau percakapan orang tua dan riwayat jawaban sistem." icon={<FileText className="h-5 w-5" />}>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <SearchBox value={search} onChange={setSearch} placeholder="Cari user, murid, pesan" />
          <Button tone="plain" onClick={exportCsv}><Download className="h-4 w-4" />Export</Button>
        </div>
      </PageHeader>
      <Panel title="Percakapan terbaru" action={<div className="grid gap-2 md:grid-cols-3"><Input label="User ID" value={filters.userId} onChange={(value) => setFilters({ ...filters, userId: value })} /><Input label="Student ID" value={filters.studentId} onChange={(value) => setFilters({ ...filters, studentId: value })} /><Input label="Tanggal" type="date" value={filters.date} onChange={(value) => setFilters({ ...filters, date: value })} /></div>}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {chatRooms.slice(0, 9).map((room) => (
            <article key={room.key} className="rounded-lg border border-slate-200 bg-white p-3 transition hover:border-[#0a1f5c]/30 hover:shadow-sm">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#0a1f5c] text-xs font-extrabold text-white">{initials(room.student?.fullName ?? room.user?.name ?? "AI")}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-[#0a1f5c]">Room {room.student?.fullName ?? "-"}</p>
                  <p className="mt-0.5 truncate text-xs font-semibold text-[#64748b]">{room.user?.name ?? "-"} / {formatDate(room.latestAt)}</p>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 text-sm leading-5 text-[#334155]">{room.latestMessage}</p>
              <div className="mt-3 flex items-center justify-between text-xs font-semibold text-[#64748b]">
                <span>{room.count} pesan</span>
                <span>{room.tokens.toLocaleString("id-ID")} token</span>
              </div>
            </article>
          ))}
          {chatRooms.length === 0 ? <Empty text="Belum ada room chat sesuai filter." /> : null}
        </div>
      </Panel>
      <Panel title="History chat" action={<div className="grid gap-2 md:grid-cols-3"><Input label="User ID" value={filters.userId} onChange={(value) => setFilters({ ...filters, userId: value })} /><Input label="Student ID" value={filters.studentId} onChange={(value) => setFilters({ ...filters, studentId: value })} /><Input label="Tanggal" type="date" value={filters.date} onChange={(value) => setFilters({ ...filters, date: value })} /></div>}>
        <div className="grid gap-3">
          {filteredHistories.map((item) => (
            <article key={item.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge value={item.role === "model" ? "confirmed" : "pending"} />
                    <p className="text-xs font-semibold text-[#64748b]">{formatDate(item.createdAt)} / {item.user?.name ?? "-"} / {item.student?.fullName ?? "-"}</p>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#334155]">{item.message}</p>
                  {item.tokensUsed ? <p className="mt-2 text-xs text-[#64748b]">{item.tokensUsed} token</p> : null}
                </div>
                {can("manage_ai_chat") ? <Button tone="danger" onClick={() => remove.mutate(item.id)}><Trash2 className="h-4 w-4" />Hapus</Button> : null}
              </div>
            </article>
          ))}
          {filteredHistories.length === 0 ? <Empty text="Belum ada history AI sesuai filter." /> : null}
        </div>
      </Panel>
      <Panel title="Batas pemakaian">
        <p className="mb-3 text-sm leading-6 text-[#64748b]">
          Kuota AI dibagi berbobot dari total {globalRequests.toLocaleString("id-ID")} request/hari dan {globalTokensPerMinute.toLocaleString("id-ID")} token/menit. Orang tua 1x{parentDailyLimit ? ` (${parentDailyLimit} request/hari)` : ""}; super admin, admin, dan kepala sekolah 2x dari kuota orang tua.
        </p>
        <div className="mb-3 grid gap-3 md:grid-cols-4">
          <div><p className="text-xs text-[#64748b]">Request hari ini</p><p className="font-display text-2xl font-extrabold text-[#0a1f5c]">{usage?.totals.requests ?? 0}</p></div>
          <div><p className="text-xs text-[#64748b]">Token hari ini</p><p className="font-display text-2xl font-extrabold text-[#0a1f5c]">{(usage?.totals.tokens ?? 0).toLocaleString("id-ID")}</p></div>
          <div><p className="text-xs text-[#64748b]">Akun aktif</p><p className="font-display text-2xl font-extrabold text-[#0a1f5c]">{usage?.totals.activeAiUsers ?? 0}</p></div>
          <div><p className="text-xs text-[#64748b]">Kuota global</p><p className="font-display text-2xl font-extrabold text-[#0a1f5c]">{globalRequests}</p></div>
        </div>
        <div className="grid gap-2">
          {(usage?.users ?? []).map((row) => (
            <div key={row.user.id} className="grid gap-2 rounded-xl border border-slate-200 p-3 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
              <div><p className="font-semibold text-[#0a1f5c]">{row.user.name}</p><p className="text-xs text-[#64748b]">Kuota akun {row.quota.dailyRequestLimit} request/hari / bobot {row.quota.weight}x</p></div>
              <span className="text-sm text-[#64748b]">{row.requestsToday}/{row.quota.dailyRequestLimit} request</span>
              <span className="text-sm text-[#64748b]">{row.remainingRequests} sisa</span>
              <span className="text-sm text-[#64748b]">{row.quota.tokensPerMinuteLimit.toLocaleString("id-ID")} token/menit</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

export function RolesSettingsPage() {
  const queryClient = useQueryClient();
  const matrix = useItem<{ roles: RoleMatrix[]; permissions: RolePermission[] }>(["roles"], "/roles").data?.data;
  const [draft, setDraft] = useState<Record<string, string[]>>({});
  useEffect(() => {
    if (!matrix) return;
    setDraft(Object.fromEntries(matrix.roles.map((role) => [role.name, role.permissions.map((permission) => permission.name)])));
  }, [matrix]);
  const save = useMutation({
    mutationFn: (role: RoleMatrix) => apiFetch(`/roles/${role.id}`, { method: "PUT", body: { permissions: draft[role.name] ?? [] } }),
    onSuccess: () => { toast.success("Permission role diperbarui"); queryClient.invalidateQueries({ queryKey: ["roles"] }); },
    onError: (error) => toast.error(error.message),
  });

  function toggle(role: RoleMatrix, permission: string) {
    const current = draft[role.name] ?? [];
    setDraft({ ...draft, [role.name]: current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission] });
  }

  return (
    <div className="grid gap-4">
      <Breadcrumbs items={[{ label: "Pengaturan", href: "/settings" }, { label: "Role Admin" }]} />
      <PageHeader title="Role Admin" description="Matrix permission internal. Super admin selalu full akses." icon={<ShieldCheck className="h-5 w-5" />} />
      <Panel title="Role dan permission">
        <div className="grid gap-4">
          {(matrix?.roles ?? []).map((role) => (
            <section key={role.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div><h2 className="font-bold text-[#0a1f5c]">{label(role.name)}</h2><p className="text-xs text-[#64748b]">{(draft[role.name] ?? []).length} permission aktif</p></div>
                <Button disabled={role.name === "super_admin" || save.isPending} onClick={() => save.mutate(role)}>Simpan role</Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {(matrix?.permissions ?? []).map((permission) => (
                  <label key={permission.id} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-[#0a1f5c]">
                    <input type="checkbox" disabled={role.name === "super_admin"} checked={role.name === "super_admin" || (draft[role.name] ?? []).includes(permission.name)} onChange={() => toggle(role, permission.name)} />
                    {permission.name}
                  </label>
                ))}
              </div>
            </section>
          ))}
        </div>
      </Panel>
    </div>
  );
}

export function AnalyticsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const data = useItem<{
    attendanceTrend: Array<{ week: string; hadir: number; tidakHadir: number }>;
    attendanceDistribution: Array<{ status: string; total: number }>;
    milestoneProgress: Array<{ name: string; total: number; mastered: number }>;
    feeCollection: Array<{ month: number; target: number; paid: number }>;
    studentsPerClass: Array<{ name: string; studentsCount: number }>;
  }>(["analytics"], "/analytics").data?.data;
  const chartBox = "h-[300px] w-full";
  if (!mounted) {
    return <div className="grid gap-4"><PageHeader title="Analitik" description="Ringkasan tren operasional sekolah." icon={<Search className="h-5 w-5" />} /><Empty text="Memuat chart analitik." /></div>;
  }
  return <div className="grid gap-4"><PageHeader title="Analitik" description="Ringkasan tren operasional sekolah." icon={<Search className="h-5 w-5" />} /><div className="grid gap-4 xl:grid-cols-2"><Panel title="Tren kehadiran per minggu"><div className={chartBox}><ResponsiveContainer width="100%" height="100%" minWidth={0}><LineChart data={data?.attendanceTrend ?? []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="week" /><YAxis /><Tooltip /><Line type="monotone" dataKey="hadir" stroke="#10b981" strokeWidth={2} /><Line type="monotone" dataKey="tidakHadir" stroke="#ef4444" strokeWidth={2} /></LineChart></ResponsiveContainer></div></Panel><Panel title="Distribusi absensi bulan ini"><div className={chartBox}><ResponsiveContainer width="100%" height="100%" minWidth={0}><PieChart><Pie data={data?.attendanceDistribution ?? []} dataKey="total" nameKey="status" outerRadius={110} label>{(data?.attendanceDistribution ?? []).map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div></Panel><Panel title="Progress milestone per area"><div className={chartBox}><ResponsiveContainer width="100%" height="100%" minWidth={0}><BarChart data={data?.milestoneProgress ?? []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="mastered" fill="#0a1f5c" /><Bar dataKey="total" fill="#f5c542" /></BarChart></ResponsiveContainer></div></Panel><Panel title="Penerimaan SPP"><div className={chartBox}><ResponsiveContainer width="100%" height="100%" minWidth={0}><AreaChart data={data?.feeCollection ?? []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip formatter={(value) => money(Number(value))} /><Area dataKey="target" fill="#f5c542" stroke="#f5c542" /><Area dataKey="paid" fill="#0a1f5c" stroke="#0a1f5c" /></AreaChart></ResponsiveContainer></div></Panel><Panel title="Jumlah murid per kelas"><div className={chartBox}><ResponsiveContainer width="100%" height="100%" minWidth={0}><BarChart data={data?.studentsPerClass ?? []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="studentsCount" fill="#10b981" /></BarChart></ResponsiveContainer></div></Panel></div></div>;
}
