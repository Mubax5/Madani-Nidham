# Madani Nidham API

Base URL lokal: `http://127.0.0.1:8000/api/v1`

Base URL production: `https://api.madanimontessori.online/api/v1`

Auth dashboard dan mobile memakai bearer token Sanctum dari `POST /auth/login`.

## Response

Sukses:

```json
{
  "success": true,
  "message": "Data berhasil diambil.",
  "data": {},
  "meta": {
    "currentPage": 1,
    "perPage": 15,
    "total": 100,
    "lastPage": 7
  }
}
```

Error:

```json
{
  "success": false,
  "message": "Pesan aman untuk pengguna.",
  "errors": {}
}
```

Catatan production: jangan tampilkan exception, SQL, stack trace, path server, atau output sistem ke user.

## Auth

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `PUT /auth/profile`
- `POST /auth/profile/photo`
- `PUT /auth/change-password`
- `GET /auth/google/url`
- `POST /auth/google/login`
- `POST /auth/google/link`

Frontend menyimpan token di `localStorage`, membuat session key per token, dan membersihkan TanStack Query cache saat login/logout/401 agar data akun lama tidak kebawa.

## Dashboard

- `GET /dashboard`
- `GET /dashboard/action-items`

Dashboard response dibuat role-aware. Role guru tidak menerima payload finance/admin yang tidak perlu.

## Akademik

- `GET|POST /students`
- `GET|PUT|DELETE /students/{id}`
- `GET|POST /classes`
- `GET|PUT|DELETE /classes/{id}`
- `GET /classes/{id}/students`
- `POST /classes/{id}/students`
- `GET|POST /attendance`
- `POST /attendance/batch`
- `DELETE /attendance/{id}`
- `GET|POST /absence-requests`
- `GET /absence-requests/my`
- `PUT /absence-requests/{id}/review`
- `DELETE /absence-requests/{id}`
- `GET|POST /journals`
- `GET|PUT|DELETE /journals/{id}`

## Montessori, Hafalan, Portofolio, Raport

- `GET /montessori/areas`
- `GET|POST /montessori/milestones`
- `PUT|DELETE /montessori/milestones/{id}`
- `GET /milestones/student/{studentId}`
- `POST /milestones/student/{studentId}/update`
- `GET /hafalan/surahs`
- `GET /hafalan/student/{studentId}`
- `POST /hafalan/student/{studentId}/update`
- `GET /doa/student/{studentId}`
- `POST /doa/student/{studentId}/update`
- `GET|POST /portfolios`
- `GET|PUT|DELETE /portfolios/{id}`
- `GET|POST /reports`
- `GET|PUT|DELETE /reports/{id}`
- `POST /reports/{id}/publish`

Input kelas untuk jurnal, portofolio, dan raport mengikuti integrasi data murid aktif, bukan input manual user.

## Komunikasi

- `GET|POST /announcements`
- `PUT|DELETE /announcements/{id}`
- `POST /announcements/{id}/publish`
- `GET|POST /agendas`
- `PUT|DELETE /agendas/{id}`
- `GET|POST /galleries`
- `GET|PUT|DELETE /galleries/{id}`
- `GET|POST /articles`
- `GET|PUT|DELETE /articles/{id}`
- `POST /articles/{id}/publish`
- `GET /notifications`
- `PUT /notifications/{notificationId}/read`

## PPDB

Public:

- `POST /registrations`
- `GET /registrations/check/{registrationNumber}`

Admin:

- `GET /registrations`
- `PUT /registrations/{id}/status`
- `POST /registrations/{id}/convert`

## Keuangan

- `GET /finance/overview`
- `GET /finance/audit`
- `GET|POST /finance/entries`
- `PUT|DELETE /finance/entries/{id}`
- `GET|POST /finance/payrolls`
- `PUT|DELETE /finance/payrolls/{id}`
- `GET /finance/payroll-teachers`
- `GET|POST /fees`
- `GET /fees/summary`
- `POST /fees/generate`
- `GET /fees/{id}`
- `POST /fees/{id}/confirm-payment`
- `POST /fees/{feeId}/payments`
- `GET|POST /fee-types`
- `PUT|DELETE /fee-types/{id}`
- `GET|POST /school-accounts`

SPP mengikuti `program_type` murid:

- Reguler: semua level.
- Half-day: semua level.
- Full-day: TK B dan TK C.

## Mobile Orang Tua

Semua endpoint mobile parent wajib bearer token role `orang_tua` dan ownership check lewat `student_parents`.

- `GET /mobile/parent/home`
- `GET /mobile/parent/children`
- `GET /mobile/parent/children/{studentId}`
- `GET /mobile/parent/children/{studentId}/attendance`
- `GET /mobile/parent/children/{studentId}/journals`
- `GET /mobile/parent/children/{studentId}/montessori`
- `GET /mobile/parent/children/{studentId}/hafalan`
- `GET /mobile/parent/children/{studentId}/fees`
- `GET /mobile/parent/children/{studentId}/portfolio`
- `GET /mobile/parent/children/{studentId}/reports`
- `GET /mobile/parent/gallery`
- `GET /mobile/parent/announcements`
- `GET /mobile/parent/agendas`
- `GET /mobile/parent/articles`
- `GET /mobile/parent/notifications`

## AI

- `POST /ai/chat`
- `GET /ai/chat/my-history`
- `GET /ai/chat/histories`
- `DELETE /ai/chat/histories/{id}`
- `GET /ai/chat/usage`

AI hanya boleh menjawab konteks sistem Madani Nidham. Pertanyaan luar konteks, termasuk yang diawali sapaan lalu membahas topik lain, harus dikembalikan sebagai `out_of_scope`.

## Upload

Semua dokumen dan foto upload wajib lewat helper upload backend:

- MIME whitelist: image, PDF, Word sesuai modul.
- Maksimum 5 MB per file.
- Nama file UUID.
- Folder tersanitasi.
- URL file tidak boleh dibuat dari input mentah user.
