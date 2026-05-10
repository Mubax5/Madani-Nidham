"use client";

/* eslint-disable @typescript-eslint/no-unused-vars */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { CompactStatCard } from "@/components/finance/compact-stat-card";
import { usePermissions } from "@/lib/use-permissions";
import { ActionButton, ActionGroup, Breadcrumbs, CategoryTabs, CompactTable, DrawerForm, PageHeader, Panel, SearchField, SelectField, StatusBadge, SubmitButton, TextArea, TextInput, buildQuery, compactMoney, enrollmentCategories, enrollmentConfirmationStatuses, enrollmentPaymentStatuses, formatMoney, levelOptions, listFrom, statusLabel, useList, type EnrollmentCategory, type EnrollmentConfirmationStatus, type EnrollmentPaymentStatus, type EnrollmentSummary, type EnrollmentUpdate } from "./workspace-shared";

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
      <section className="rounded-lg border border-slate-200 bg-white p-3">
        <h1 className="font-display text-xl font-extrabold uppercase text-[#0a1f5c]">Uang Pendaftaran</h1>
        <p className="mt-1 text-xs font-semibold text-[#64748b]">Rekap manual siswa baru, daftar ulang, status lanjut, dan pembayaran.</p>
      </section>
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
