"use client";

/* eslint-disable @typescript-eslint/no-unused-vars */

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { ActionButton, ActionGroup, CategoryTabs, CompactTable, EmptyState, PageHeader, Panel, SearchField, StatusBadge, SubmitButton, TextInput, attendanceOptions, buildQuery, formatDate, levelTabs, listFrom, matchesLevel, statusLabel, studentClass, studentLevel, todayInput, useList, type Attendance, type AttendanceStatus, type SchoolClass, type Student } from "./workspace-shared";

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
