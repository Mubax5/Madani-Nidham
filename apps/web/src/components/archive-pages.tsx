"use client";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Save, Search } from "lucide-react";
import Link from "next/link";
import { FormEvent, ReactNode, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import {
  StatusBadge,
  formatDate,
  listFrom,
  statusLabel,
  todayInput,
  type Journal,
  type MilestoneStatus,
  type MontessoriArea,
  type MontessoriMilestone,
  type SchoolClass,
  type Student,
} from "@/components/fast-pages/workspace-shared";

type HafalanStatus = "belum" | "sedang_dihafal" | "lancar" | "mutqin";

type HafalanSurah = {
  id: number;
  surahNumber: number;
  nameArabic: string;
  nameLatin: string;
  nameId: string;
  totalAyat: number;
  targetLevel?: string | null;
  studentStatus?: HafalanStatus;
  startedAt?: string | null;
  completedAt?: string | null;
  lastAyatReached?: number | null;
  notes?: string | null;
  updatedAt?: string | null;
};

type MilestoneArchiveRow = {
  student: Student;
  area: MontessoriArea;
  milestone: MontessoriMilestone;
  status: MilestoneStatus;
  observedAt?: string | null;
  updatedAt?: string | null;
};

type HafalanArchiveRow = {
  student: Student;
  surah: HafalanSurah;
  status: HafalanStatus;
  updatedAt?: string | null;
};

const milestoneStatuses: MilestoneStatus[] = ["not_started", "introduced", "in_progress", "mastered"];
const hafalanStatuses: HafalanStatus[] = ["belum", "sedang_dihafal", "lancar", "mutqin"];

function Shell({ backHref, title, note, children }: { backHref: string; title: string; note: string; children: ReactNode }) {
  return (
    <div className="grid gap-4">
      <section className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <Link href={backHref} className="inline-flex items-center gap-1 text-xs font-bold text-[#0a1f5c] hover:underline">
              <ArrowLeft className="h-3.5 w-3.5" />
              Kembali
            </Link>
            <h1 className="font-display mt-2 text-xl font-extrabold text-[#0a1f5c]">{title}</h1>
            <p className="mt-1 text-xs font-semibold text-[#64748b]">{note}</p>
          </div>
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-[#0a1f5c]">
            Hari ini, {formatDate(todayInput())}
          </p>
        </div>
      </section>
      {children}
    </div>
  );
}

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-col gap-2 border-b border-slate-100 px-3 py-2 md:flex-row md:items-center md:justify-between">
        <h2 className="text-[13px] font-bold text-[#0a1f5c]">{title}</h2>
        {action}
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="relative block min-w-[220px]">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]" />
      <input className="madani-input w-full pl-10" style={{ paddingLeft: 38 }} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function DateRange({ from, to, onFrom, onTo }: { from: string; to: string; onFrom: (value: string) => void; onTo: (value: string) => void }) {
  const max = todayInput();
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="grid gap-1 text-xs font-bold text-[#0a1f5c]">
        Dari
        <input className="madani-input" type="date" max={max} value={from} onChange={(event) => onFrom(event.target.value)} />
      </label>
      <label className="grid gap-1 text-xs font-bold text-[#0a1f5c]">
        Sampai
        <input className="madani-input" type="date" max={max} value={to} onChange={(event) => onTo(event.target.value)} />
      </label>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-xs font-semibold text-[#64748b]">{text}</div>;
}

function matchDate(value?: string | null, from = "", to = "") {
  const date = value?.slice(0, 10) ?? "";
  if (!date && (from || to)) return false;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

export function JournalsArchivePage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [classId, setClassId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState(todayInput());
  const [editing, setEditing] = useState<Journal | null>(null);
  const [form, setForm] = useState({ content: "", mood: "happy", isPublished: true });
  const classes = listFrom(useQuery({ queryKey: ["classes", "journal-archive"], queryFn: () => apiFetch<SchoolClass[]>("/classes?perPage=100") }).data);
  const journalsQuery = useQuery({ queryKey: ["journals", "archive"], queryFn: () => apiFetch<Journal[]>("/journals?perPage=100"), retry: false });
  const journals = listFrom(journalsQuery.data);

  const filtered = journals.filter((journal) => {
    const keyword = search.trim().toLowerCase();
    if (classId && String(journal.class?.id) !== classId) return false;
    if (!matchDate(journal.date, from, to)) return false;
    if (!keyword) return true;
    return [journal.student?.fullName ?? "", journal.class?.name ?? "", journal.content, statusLabel(journal.mood), formatDate(journal.date)]
      .join(" ")
      .toLowerCase()
      .includes(keyword);
  });

  function openEdit(journal: Journal) {
    setEditing(journal);
    setForm({ content: journal.content, mood: journal.mood ?? "happy", isPublished: journal.isPublished !== false });
  }

  const save = useMutation({
    mutationFn: () => apiFetch(`/journals/${editing?.id}`, { method: "PUT", body: form }),
    onSuccess: () => {
      toast.success("Jurnal diperbarui");
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["journals"] });
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <Shell backHref="/journals" title="Semua Data Jurnal" note="Arsip semua jurnal tersimpan, bisa difilter, dicari, dan diedit.">
      <Panel
        title={`${filtered.length} jurnal tampil`}
        action={
          <div className="grid gap-2 lg:grid-cols-[260px_180px_320px]">
            <SearchBox value={search} onChange={setSearch} placeholder="Cari murid, kelas, catatan" />
            <select className="madani-input" value={classId} onChange={(event) => setClassId(event.target.value)}>
              <option value="">Semua kelas</option>
              {classes.map((item) => <option key={item.id} value={item.id}>{item.name} / {item.level}</option>)}
            </select>
            <DateRange from={from} to={to} onFrom={setFrom} onTo={setTo} />
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-[#64748b]">
              <tr><th className="p-3">Murid</th><th className="p-3">Tanggal</th><th className="p-3">Catatan</th><th className="p-3">Status</th><th className="p-3">Diubah</th><th className="p-3 text-right">Aksi</th></tr>
            </thead>
            <tbody>
              {filtered.map((journal) => (
                <tr key={journal.id} className="border-t border-slate-100">
                  <td className="p-3"><p className="font-bold text-[#0a1f5c]">{journal.student?.fullName ?? "-"}</p><p className="text-xs text-[#64748b]">{journal.class?.name ?? "-"}</p></td>
                  <td className="p-3 text-[#64748b]">{formatDate(journal.date)}</td>
                  <td className="p-3"><span className="line-clamp-2">{journal.content}</span></td>
                  <td className="p-3"><StatusBadge value={journal.isPublished ? "active" : "pending"} /></td>
                  <td className="p-3 text-xs text-[#64748b]">{formatDate((journal as Journal & { updatedAt?: string }).updatedAt)}</td>
                  <td className="p-3 text-right"><button type="button" className="madani-button border border-slate-200 bg-white text-[#0a1f5c]" onClick={() => openEdit(journal)}><Pencil className="h-3.5 w-3.5" />Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 ? <Empty text={journalsQuery.isLoading ? "Memuat jurnal." : "Tidak ada jurnal sesuai filter."} /> : null}
      </Panel>

      {editing ? (
        <Editor title="Edit jurnal" onClose={() => setEditing(null)} onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
          <select className="madani-input" value={form.mood} onChange={(event) => setForm({ ...form, mood: event.target.value })}>
            <option value="happy">Senang</option><option value="neutral">Tenang</option><option value="sad">Perlu didampingi</option><option value="energetic">Aktif</option><option value="tired">Lelah</option>
          </select>
          <textarea className="madani-input min-h-40" value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} />
          <label className="flex items-center gap-2 text-xs font-bold text-[#0a1f5c]"><input type="checkbox" checked={form.isPublished} onChange={(event) => setForm({ ...form, isPublished: event.target.checked })} />Publish</label>
          <button className="madani-button bg-[#0a1f5c] text-white" type="submit" disabled={save.isPending}><Save className="h-4 w-4" />Simpan</button>
        </Editor>
      ) : null}
    </Shell>
  );
}

export function MontessoriArchivePage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState(todayInput());
  const students = listFrom(useQuery({ queryKey: ["students", "milestone-archive"], queryFn: () => apiFetch<Student[]>("/students?perPage=100") }).data);
  const progressQueries = useQueries({
    queries: students.map((student) => ({
      queryKey: ["milestone-archive", student.id],
      queryFn: () => apiFetch<MontessoriArea[]>(`/milestones/student/${student.id}`),
      retry: false,
      staleTime: 5 * 60 * 1000,
    })),
  });
  const rows = progressQueries.flatMap((query, index) => {
    const student = students[index];
    return (query.data?.data ?? []).flatMap((area) => (area.milestones ?? []).map((milestone) => ({
      student,
      area,
      milestone,
      status: (milestone.studentStatus ?? "not_started") as MilestoneStatus,
      observedAt: milestone.observedAt,
      updatedAt: (milestone as MontessoriMilestone & { updatedAt?: string | null }).updatedAt,
    })));
  }).filter((row) => row.status !== "not_started" || row.observedAt || row.updatedAt);
  const filtered = rows.filter((row) => {
    const keyword = search.trim().toLowerCase();
    if (status && row.status !== status) return false;
    if (!matchDate(row.observedAt ?? row.updatedAt, from, to)) return false;
    if (!keyword) return true;
    return [row.student.fullName, row.area.name, row.milestone.name, row.milestone.description ?? "", statusLabel(row.status)].join(" ").toLowerCase().includes(keyword);
  });
  const update = useMutation({
    mutationFn: (row: { studentId: number; milestoneId: number; status: MilestoneStatus }) => apiFetch(`/milestones/student/${row.studentId}/update`, { method: "POST", body: { milestoneId: row.milestoneId, status: row.status, observedAt: todayInput() } }),
    onSuccess: () => { toast.success("Progress Montessori diperbarui"); queryClient.invalidateQueries({ queryKey: ["milestone-archive"] }); },
    onError: (error) => toast.error(error.message),
  });

  return (
    <ArchiveStatusTable
      backHref="/milestones"
      title="Semua Data Montessori"
      note="Semua progress Montessori tersimpan lintas murid."
      search={search}
      setSearch={setSearch}
      status={status}
      setStatus={setStatus}
      statuses={milestoneStatuses}
      from={from}
      to={to}
      setFrom={setFrom}
      setTo={setTo}
      rows={filtered}
      loading={progressQueries.some((query) => query.isLoading)}
      emptyText="Belum ada progress Montessori sesuai filter."
      renderRow={(row: MilestoneArchiveRow) => (
        <tr key={`${row.student.id}-${row.milestone.id}`} className="border-t border-slate-100">
          <td className="p-3"><p className="font-bold text-[#0a1f5c]">{row.student.fullName}</p><p className="text-xs text-[#64748b]">{row.student.classes?.[0]?.name ?? "-"}</p></td>
          <td className="p-3"><p className="font-semibold text-[#0a1f5c]">{row.milestone.name}</p><p className="text-xs text-[#64748b]">{row.area.name}</p></td>
          <td className="p-3"><StatusBadge value={row.status} /></td>
          <td className="p-3 text-xs text-[#64748b]">{formatDate(row.observedAt)}</td>
          <td className="p-3 text-xs text-[#64748b]">{formatDate(row.updatedAt)}</td>
          <td className="p-3"><select className="madani-input" value={row.status} onChange={(event) => update.mutate({ studentId: row.student.id, milestoneId: row.milestone.id, status: event.target.value as MilestoneStatus })}>{milestoneStatuses.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}</select></td>
        </tr>
      )}
    />
  );
}

export function HafalanArchivePage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState(todayInput());
  const students = listFrom(useQuery({ queryKey: ["students", "hafalan-archive"], queryFn: () => apiFetch<Student[]>("/students?perPage=100") }).data);
  const progressQueries = useQueries({
    queries: students.map((student) => ({
      queryKey: ["hafalan-archive", student.id],
      queryFn: () => apiFetch<{ student: Student; surahs: HafalanSurah[] }>(`/hafalan/student/${student.id}`),
      retry: false,
      staleTime: 5 * 60 * 1000,
    })),
  });
  const rows = progressQueries.flatMap((query, index) => {
    const student = students[index];
    return (query.data?.data?.surahs ?? []).map((surah) => ({
      student,
      surah,
      status: (surah.studentStatus ?? "belum") as HafalanStatus,
      updatedAt: surah.updatedAt ?? surah.completedAt ?? surah.startedAt,
    }));
  }).filter((row) => row.status !== "belum" || row.updatedAt);
  const filtered = rows.filter((row) => {
    const keyword = search.trim().toLowerCase();
    if (status && row.status !== status) return false;
    if (!matchDate(row.updatedAt, from, to)) return false;
    if (!keyword) return true;
    return [row.student.fullName, row.surah.nameLatin, row.surah.nameId, row.surah.targetLevel ?? "", statusLabel(row.status)].join(" ").toLowerCase().includes(keyword);
  });
  const update = useMutation({
    mutationFn: (row: { studentId: number; surahId: number; status: HafalanStatus }) => apiFetch(`/hafalan/student/${row.studentId}/surah`, { method: "POST", body: { surahId: row.surahId, status: row.status } }),
    onSuccess: () => { toast.success("Progress hafalan diperbarui"); queryClient.invalidateQueries({ queryKey: ["hafalan-archive"] }); },
    onError: (error) => toast.error(error.message),
  });

  return (
    <ArchiveStatusTable
      backHref="/hafalan"
      title="Semua Data Hafalan"
      note="Semua progress hafalan tersimpan lintas murid."
      search={search}
      setSearch={setSearch}
      status={status}
      setStatus={setStatus}
      statuses={hafalanStatuses}
      from={from}
      to={to}
      setFrom={setFrom}
      setTo={setTo}
      rows={filtered}
      loading={progressQueries.some((query) => query.isLoading)}
      emptyText="Belum ada progress hafalan sesuai filter."
      renderRow={(row: HafalanArchiveRow) => (
        <tr key={`${row.student.id}-${row.surah.id}`} className="border-t border-slate-100">
          <td className="p-3"><p className="font-bold text-[#0a1f5c]">{row.student.fullName}</p><p className="text-xs text-[#64748b]">{row.student.classes?.[0]?.name ?? "-"}</p></td>
          <td className="p-3"><p className="font-semibold text-[#0a1f5c]">{row.surah.nameLatin}</p><p className="text-xs text-[#64748b]">{row.surah.nameId} / {row.surah.totalAyat} ayat</p></td>
          <td className="p-3"><StatusBadge value={row.status} /></td>
          <td className="p-3 text-xs text-[#64748b]">-</td>
          <td className="p-3 text-xs text-[#64748b]">{formatDate(row.updatedAt)}</td>
          <td className="p-3"><select className="madani-input" value={row.status} onChange={(event) => update.mutate({ studentId: row.student.id, surahId: row.surah.id, status: event.target.value as HafalanStatus })}>{hafalanStatuses.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}</select></td>
        </tr>
      )}
    />
  );
}

function ArchiveStatusTable<T>({
  backHref,
  title,
  note,
  search,
  setSearch,
  status,
  setStatus,
  statuses,
  from,
  to,
  setFrom,
  setTo,
  rows,
  loading,
  emptyText,
  renderRow,
}: {
  backHref: string;
  title: string;
  note: string;
  search: string;
  setSearch: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
  statuses: string[];
  from: string;
  to: string;
  setFrom: (value: string) => void;
  setTo: (value: string) => void;
  rows: T[];
  loading: boolean;
  emptyText: string;
  renderRow: (row: T) => ReactNode;
}) {
  return (
    <Shell backHref={backHref} title={title} note={note}>
      <Panel
        title={`${rows.length} data tampil`}
        action={
          <div className="grid gap-2 lg:grid-cols-[260px_180px_320px]">
            <SearchBox value={search} onChange={setSearch} placeholder="Cari murid, kelas, status" />
            <select className="madani-input" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">Semua status</option>
              {statuses.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
            </select>
            <DateRange from={from} to={to} onFrom={setFrom} onTo={setTo} />
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-[#64748b]">
              <tr><th className="p-3">Murid</th><th className="p-3">Data</th><th className="p-3">Status</th><th className="p-3">Tanggal</th><th className="p-3">Diubah</th><th className="p-3">Edit</th></tr>
            </thead>
            <tbody>{rows.map((row) => renderRow(row))}</tbody>
          </table>
        </div>
        {rows.length === 0 ? <Empty text={loading ? "Memuat data." : emptyText} /> : null}
      </Panel>
    </Shell>
  );
}

function Editor({ title, children, onClose, onSubmit }: { title: string; children: ReactNode; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <div className="fixed inset-y-0 left-0 right-0 z-50 grid place-items-center p-3 lg:left-[var(--madani-sidebar-offset,0px)]">
      <button type="button" aria-label="Tutup popup" className="absolute inset-0 bg-[#071744]/58" onClick={onClose} />
      <form onSubmit={onSubmit} className="relative z-10 grid max-h-[90vh] w-full max-w-xl gap-3 overflow-y-auto rounded-lg bg-white p-4 shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold text-[#0a1f5c]">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-[#0a1f5c]">Tutup</button>
        </div>
        {children}
      </form>
    </div>
  );
}
