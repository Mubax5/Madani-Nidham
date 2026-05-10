# Madani Nidham API

Base URL lokal: `http://localhost:8000/api/v1`

Semua response sukses:

```json
{
  "success": true,
  "message": "Data berhasil diambil",
  "data": {},
  "meta": {
    "currentPage": 1,
    "perPage": 15,
    "total": 100,
    "lastPage": 7
  }
}
```

Semua response error:

```json
{
  "success": false,
  "message": "Pesan error Bahasa Indonesia",
  "errors": {}
}
```

Endpoint utama:

- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`
- `GET /dashboard`
- `GET|POST /students`
- `GET|POST /classes`
- `GET /classes/{id}/students`
- `GET /attendance`
- `POST /attendance/batch`
- `GET|POST /journals`
- `GET /montessori/areas`
- `GET|POST /montessori/milestones`
- `GET /milestones/student/{studentId}`
- `POST /milestones/student/{studentId}/update`
- `GET|POST /reports`
- `POST /reports/{id}/publish`
- `GET|POST /announcements`
- `POST /announcements/{id}/publish`
- `GET|POST /agendas`
- `POST /registrations` public
- `GET /registrations/check/{registrationNumber}` public
- `GET /registrations` admin
- `PUT /registrations/{id}/status` admin
- `POST /registrations/{id}/convert` admin
- `GET|PUT /settings`

Auth dashboard memakai bearer token dari `POST /auth/login`. Sanctum SPA cookie juga disiapkan lewat konfigurasi `statefulApi`.
