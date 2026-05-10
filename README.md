# Madani Nidham

Sistem akademik untuk TKIT Madani Montessori Islamic School. Phase 1 berisi Laravel API, Next.js dashboard admin/guru, dan integrasi PPDB publik di repo website lama `madani-montessori`.

## Stack

- API: Laravel 11, Sanctum, Spatie Permission, DomPDF
- Dashboard: Next.js 14 App Router, Tailwind CSS, TanStack Query, Recharts
- Database lokal: Laragon MySQL atau Docker MySQL 8
- Cache/queue: database driver lokal, Redis opsional

## Struktur

```txt
apps/
  api/      Laravel API
  web/      Next.js dashboard
docs/
  api.md
  database.md
```

## Setup Lokal

API:

```bash
cd apps/api
copy .env.example .env
php artisan key:generate
php artisan storage:link
php artisan migrate --seed
php artisan serve
```

Dashboard:

```bash
cd apps/web
copy .env.local.example .env.local
npm install
npm run dev
```

Default akun demo lokal dari seeder non-production:

- `admin@madani-nidham.local` / `password`
- `guru@madani-nidham.local` / `password`
- `ortu@madani-nidham.local` / `password`

Ganti atau nonaktifkan akun demo sebelum deploy production.

## PPDB Publik

Halaman PPDB ada di repo website publik lama `madani-montessori`:

- `/ppdb`
- `/ppdb/daftar`
- `/ppdb/cek-status`

Set `MADANI_NIDHAM_API_URL` di `.env` website lama agar form publik submit ke API Madani Nidham.

## Fitur Phase 1

- Auth admin/guru via Sanctum
- Dashboard statistik
- Manajemen murid, kelas, user
- Absensi batch dan rekap
- Jurnal perkembangan dengan upload fallback lokal
- Area Montessori dan milestone manual
- Raport PDF dengan tanda tangan visual dan field PSrE-ready
- Pengumuman dan DB notification
- Agenda sekolah
- PPDB publik, cek status, review admin, one-click convert ke murid

## Known Issues

- Integrasi PSrE asli belum aktif. Field dan status sudah siap, provider dipilih setelah credential/kontrak tersedia.
- Cloudinary dan FCM masih env-gated. Local fallback berjalan tanpa credential.
- Dashboard Phase 1 memakai form ID sederhana untuk relasi kelas/murid. UI relasi bisa dipoles jadi selector kaya data pada iterasi berikutnya.
