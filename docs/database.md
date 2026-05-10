# Database

Phase 1 memakai tabel:

- `users`
- `roles`, `permissions`, `model_has_roles`, `role_has_permissions`
- `academic_years`
- `classes`
- `students`
- `student_parents`
- `student_classes`
- `attendances`
- `journals`
- `montessori_areas`
- `montessori_milestones`
- `student_milestones`
- `reports`
- `announcements`
- `school_agendas`
- `registrations`
- `notifications`
- `settings`

Seeder production-safe:

- Role dan permission
- Tahun ajaran aktif
- 5 area Montessori
- Settings PPDB dan tanda tangan raport

Seeder local/testing:

- Admin demo
- Guru demo
- Orang tua demo
- Kelas `TK A - Matahari`
- Murid demo `MDN-001`

Catatan PSrE:

- `reports.signature_status`: `unsigned`, `visual_signed`, `psre_pending`, `psre_signed`, `psre_failed`
- `reports.signed_pdf_url`
- `reports.psre_provider`
- `reports.psre_document_id`
- `reports.signature_certificate_info`

Integrasi provider PSrE asli belum diaktifkan di Phase 1.
