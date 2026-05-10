"use client";

/* eslint-disable @typescript-eslint/no-unused-vars */

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Download, Eye, RefreshCw, Wallet } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { CompactStatCard } from "@/components/finance/compact-stat-card";
import { usePermissions } from "@/lib/use-permissions";
import { Badge, Breadcrumbs, Button, Empty, FileInput, Input, Modal, PageHeader, Panel, SearchBox, Select, Textarea, appendFormValue, buildQuery, compactMoney, formatDate, listFrom, money, monthName, useItem, useList, type BankAccount, type StudentFee } from "./phase-shared";

export function FeesPage({ initialGenerateOpen = false }: { initialGenerateOpen?: boolean } = {}) {
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [aging, setAging] = useState("");
  const [search, setSearch] = useState("");
  const [detailFee, setDetailFee] = useState<StudentFee | null>(null);
  const [generateOpen, setGenerateOpen] = useState(initialGenerateOpen);
  const [confirmFee, setConfirmFee] = useState<StudentFee | null>(null);
  const [generateForm, setGenerateForm] = useState({ month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()) });
  const [confirmForm, setConfirmForm] = useState({ receivedAmount: "", bankAccountId: "", proofUrl: "", notes: "" });
  const [confirmProof, setConfirmProof] = useState<File[]>([]);
  const feesQuery = useList<StudentFee>(["fees", status, aging], buildQuery("/fees", { status, aging, perPage: 100 }));
  const fees = listFrom(feesQuery.data).filter((fee) => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return true;
    return [
      fee.invoiceNumber ?? "",
      fee.student?.fullName ?? "",
      fee.feeType?.name ?? "",
      fee.bankAccount?.bankName ?? "",
      fee.status,
      monthName(fee.month, fee.year),
    ].join(" ").toLowerCase().includes(keyword);
  });
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
      <Breadcrumbs items={[{ label: "Keuangan", href: "/finance" }, { label: "Keuangan SPP" }]} />
      <PageHeader title="Keuangan SPP" description="Invoice manual transfer, kode unik, aging, partial payment, dan konfirmasi pembayaran." icon={<Wallet className="h-5 w-5" />}>
        <div className="flex w-full flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="font-display text-xl font-extrabold text-[#0a1f5c]">Keuangan SPP</h1>
            <p className="mt-1 text-xs font-semibold text-[#64748b]">Invoice manual transfer, kode unik, aging, partial payment, dan konfirmasi pembayaran.</p>
          </div>
          <div className="flex flex-wrap gap-2">
          <Button tone="plain" onClick={exportCsv}><Download className="h-4 w-4" />Export CSV</Button>
          {can("manage_fees") ? <Button onClick={() => setGenerateOpen(true)}><RefreshCw className="h-4 w-4" />Generate</Button> : null}
          </div>
        </div>
      </PageHeader>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <CompactStatCard label="Target SPP" value={compactMoney(summary?.target)} description="Target bulan ini" borderColor="blue" trend={{ value: `${collectionRate}% sudah terbayar`, positive: collectionRate >= 70 }} />
        <CompactStatCard label="Terbayar" value={compactMoney(summary?.paid)} description={`${summary?.paidCount ?? 0} invoice lunas`} borderColor="emerald" />
        <CompactStatCard label="Belum Dibayar" value={compactMoney(summary?.outstanding)} description={`${openInvoiceCount} invoice unpaid/partial`} borderColor="amber" />
        <CompactStatCard label="Overdue" value={compactMoney(summary?.overdue)} description={`${summary?.overdueCount ?? 0} invoice lewat tempo`} borderColor="rose" />
      </section>

      <Panel title="Daftar tagihan" action={<div className="flex flex-wrap gap-2"><SearchBox value={search} onChange={setSearch} placeholder="Cari murid, invoice, tagihan" /><Select label="Status" value={status} onChange={setStatus}><option value="">Semua</option><option value="unpaid">Belum bayar</option><option value="partial">Partial</option><option value="paid">Lunas</option></Select><Select label="Aging" value={aging} onChange={setAging}><option value="">Semua aging</option><option value="overdue">Overdue</option><option value="due_soon">Jatuh tempo 7 hari</option></Select></div>}>
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
  return <>
    <Breadcrumbs items={[{ label: "Keuangan", href: "/fees" }, { label: "Generate" }]} />
    <FeesPage initialGenerateOpen />
  </>;
}

export function FeeDetailPage({ id }: { id: number }) {
  const fee = useItem<StudentFee>(["fee", id], `/fees/${id}`, Boolean(id)).data?.data;

  return (
    <div className="grid gap-4">
      <Breadcrumbs items={[{ label: "Keuangan", href: "/fees" }, { label: fee?.invoiceNumber ?? "Detail tagihan" }]} />
      <Panel title="Detail Tagihan">
        {fee ? (
          <div className="grid gap-3">
            <div>
              <h1 className="text-lg font-extrabold text-[#0a1f5c]">{fee.student?.fullName ?? "-"}</h1>
              <p className="text-sm text-[#64748b]">{monthName(fee.month, fee.year)} / {fee.invoiceNumber ?? `INV-${fee.id}`}</p>
            </div>
            <FeeDetailContent fee={fee} />
          </div>
        ) : (
          <Empty text="Memuat detail tagihan." />
        )}
      </Panel>
    </div>
  );
}
