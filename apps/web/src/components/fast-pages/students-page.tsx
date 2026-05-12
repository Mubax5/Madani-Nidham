"use client";

/* eslint-disable @typescript-eslint/no-unused-vars */

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, UserCheck, UserX, Users } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { StudentPhotoFrame } from "@/components/student-photo-frame";
import { usePermissions } from "@/lib/use-permissions";
import { ActionButton, ActionGroup, CategoryTabs, CompactTable, DrawerForm, PageHeader, Panel, SearchField, SelectField, StatusBadge, SubmitButton, TextArea, TextInput, buildQuery, classLabel, firstParent, formatDate, initials, levelOptions, levelTabs, listFrom, matchesLevel, programOptions, roleLabel, roleNames, studentClass, studentLevel, todayInput, useList, type SchoolClass, type Student, type User } from "./workspace-shared";

export function StudentsPage() {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<number | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [originalPhotoUrl, setOriginalPhotoUrl] = useState("");
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const [form, setForm] = useState({
    nis: "",
    fullName: "",
    nickname: "",
    birthDate: "",
    birthPlace: "",
    gender: "L",
    address: "",
    joinDate: todayInput(),
    programType: "regular",
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

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(photoFile);
    setPhotoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  function resetStudentForm() {
    setEditingStudentId(null);
    setPhotoFile(null);
    setPhotoUrl("");
    setOriginalPhotoUrl("");
    setForm({
      nis: "",
      fullName: "",
      nickname: "",
      birthDate: "",
      birthPlace: "",
      gender: "L",
      address: "",
      joinDate: todayInput(),
      programType: "regular",
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
    setPhotoFile(null);
    setPhotoUrl(student.photoUrl ?? "");
    setOriginalPhotoUrl(student.photoUrl ?? "");
    setForm({
      nis: student.nis ?? "",
      fullName: student.fullName,
      nickname: student.nickname ?? "",
      birthDate: student.birthDate?.slice(0, 10) ?? "",
      birthPlace: student.birthPlace ?? "",
      gender: student.gender ?? "L",
      address: student.address ?? "",
      joinDate: student.joinDate?.slice(0, 10) ?? todayInput(),
      programType: student.programType ?? "regular",
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
    mutationFn: async () => {
      const response = await apiFetch<Student>(
        editingStudentId ? `/students/${editingStudentId}` : "/students",
        {
          method: editingStudentId ? "PUT" : "POST",
          body: {
            ...form,
            classId: form.classId || undefined,
            parentRelation: form.parentRelation,
          },
        },
      );
      const nextPhotoUrl = photoUrl.trim();
      const shouldSavePhoto = Boolean(photoFile || (nextPhotoUrl && nextPhotoUrl !== originalPhotoUrl));
      const savedId = response.data.id ?? editingStudentId;

      if (savedId && shouldSavePhoto) {
        const body = new FormData();
        if (photoFile) body.append("photo", photoFile);
        if (nextPhotoUrl && nextPhotoUrl !== originalPhotoUrl) body.append("photoUrl", nextPhotoUrl);
        await apiFetch(`/students/${savedId}/photo`, { method: "POST", body });
      }

      return response;
    },
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
                label="Program TK"
                value={form.programType}
                required
                onChange={(value) => setForm({ ...form, programType: value })}
              >
                {programOptions.map((program) => (
                  <option key={program.value} value={program.value}>
                    {program.label}
                  </option>
                ))}
              </SelectField>
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

          {editingStudentId ? (
            <section className="grid gap-3 border-t border-slate-200 pt-4">
              <p className="text-xs font-bold uppercase text-[#64748b]">
                Foto anak
              </p>
              <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[96px_1fr]">
                <StudentPhotoFrame
                  size="xl"
                  student={{
                    fullName: form.fullName,
                    gender: form.gender,
                    photoUrl: photoPreviewUrl || photoUrl || originalPhotoUrl,
                  }}
                />
                <div className="grid gap-3">
                  <label className="grid gap-1.5 text-xs font-semibold text-[#0a1f5c]">
                    Upload foto
                    <input
                      className="madani-input"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
                    />
                  </label>
                  <TextInput
                    label="URL foto"
                    value={photoUrl}
                    onChange={setPhotoUrl}
                  />
                  <p className="text-xs leading-5 text-[#64748b]">
                    Foto ini dipakai di Montessori dan Hafalan.
                  </p>
                </div>
              </div>
            </section>
          ) : null}

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
              key: "program",
              header: "Program",
              render: (student) =>
                programOptions.find((item) => item.value === student.programType)
                  ?.label ?? "Reguler",
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
