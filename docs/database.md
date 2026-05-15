# Database

Database adalah sumber data tunggal untuk dashboard web, mobile parent app, PPDB publik, finance, dan AI.

## Core Laravel

- `users`
- `password_reset_tokens`
- `sessions`
- `personal_access_tokens`
- `cache`, `cache_locks`
- `jobs`, `job_batches`, `failed_jobs`

## Role dan Permission

- `roles`
- `permissions`
- `model_has_roles`
- `model_has_permissions`
- `role_has_permissions`

Super admin mendapat semua permission. Role lain wajib dibatasi lewat middleware API.

## Akademik

- `academic_years`
- `classes`
- `students`
- `student_parents`
- `student_classes`
- `attendances`
- `absence_requests`
- `journals`

Data kelas pada input jurnal, portofolio, dan raport diambil dari relasi murid aktif, bukan input manual user.

## Montessori, Hafalan, Portofolio, Raport

- `montessori_areas`
- `montessori_milestones`
- `student_milestones`
- `hafalan_surahs`
- `student_hafalan`
- `doa_daily`
- `student_doa`
- `student_portfolios`
- `reports`

Catatan PSrE:

- `reports.signature_status`: `unsigned`, `visual_signed`, `psre_pending`, `psre_signed`, `psre_failed`
- `reports.signed_pdf_url`
- `reports.psre_provider`
- `reports.psre_document_id`
- `reports.signature_certificate_info`

Integrasi provider PSrE asli belum aktif.

## Komunikasi

- `announcements`
- `school_agendas`
- `class_galleries`
- `parenting_articles`
- `notifications`

## PPDB

- `registrations`
- `enrollment_updates`

`registrations` dapat dikonversi menjadi murid aktif. `enrollment_updates` dipakai untuk uang pendaftaran dan status pembayaran PPDB agar terbaca di pusat keuangan.

## Keuangan

- `school_bank_accounts`
- `fee_types`
- `student_fees`
- `fee_payments`
- `finance_entries`
- `teacher_payrolls`

`fee_types` mendukung:

- `applicable_levels`
- `applicable_programs`
- `is_recurring`
- `is_active`

Aturan SPP:

- Reguler: semua level.
- Half-day: semua level.
- Full-day: TK B dan TK C.

## AI

- `ai_chat_histories`
- `ai_chat_usages`
- `ai_manager_chat_histories`

History AI harus tetap terkait user, role, student bila ada, dan sumber data yang dipakai. AI guard menolak pertanyaan di luar konteks sistem.

## Production Auth dan Program Murid

Kolom tambahan production:

- `users.google_id`
- `users.google_linked_at`
- `users.password_changed_at`
- `users.last_login_ip`
- `users.last_login_user_agent`
- `students.program_type`
- `student_classes.program_type`
- `registrations.program_type`

Cache frontend dipisah per token session agar data super admin tidak terbawa ke akun guru/orang tua.

## Index

Migration `add_performance_indexes` menambahkan index untuk query umum:

- murid per status/kelas
- absensi per tanggal/status
- jurnal per tanggal/murid
- raport per tahun/semester
- tagihan per status/periode
- PPDB per status/tahun
- agenda/pengumuman aktif
- progress Montessori/hafalan/doa

## Seeder

Seeder production-safe:

- Role dan permission.
- Tahun ajaran aktif.
- Area Montessori.
- Hafalan/doa dasar.
- Rekening sekolah contoh bila belum ada.
- Settings PPDB, website, dan tanda tangan raport.

Seeder local/testing:

- Akun demo admin, kepala sekolah, staf, guru, orang tua.
- Kelas KB, TK A, TK B, TK C.
- Murid demo dengan parent link.
- Data contoh akademik, finance, artikel, dan PPDB.

Ganti atau nonaktifkan akun demo sebelum production.

## Catatan

- File upload disimpan sebagai URL/path di tabel modul masing-masing; file fisik divalidasi helper upload backend.
- Jangan menghapus data user yang masih punya aktivitas. Nonaktifkan akun bila relasi historis masih dibutuhkan.
