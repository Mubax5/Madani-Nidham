# Madani Nidham

Sistem informasi akademik, operasional, keuangan, komunikasi, mobile orang tua, dan AI internal untuk TKIT Madani Montessori Islamic School.

## Stack

- API: Laravel 11, Sanctum, Spatie Permission, DomPDF
- Dashboard: Next.js 15 App Router, Tailwind CSS, TanStack Query, Recharts
- Mobile orang tua: Flutter Android/iOS
- Database lokal: SQLite, Laragon MySQL/MariaDB, atau Docker MySQL 8
- Cache/queue: database driver lokal, Redis opsional

## Struktur

```txt
apps/
  api/      Laravel API
  web/      Next.js dashboard
  mobile/   Flutter app orang tua
docs/
  api.md
  database.md
  deployment.md
  local-web-runbook.md
  mobile-parent-app.md
```

## Setup Lokal

API:

```bash
cd apps/api
copy .env.example .env
php artisan key:generate
php artisan storage:link
php artisan migrate --seed
php artisan serve --host=127.0.0.1 --port=8000
```

Dashboard dev:

```bash
cd apps/web
copy .env.local.example .env.local
npm install
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Dashboard production lokal untuk cek performa:

```bash
cd apps/web
npm run build
npm run start -- --hostname 127.0.0.1 --port 3000
```

Mobile orang tua:

```bash
cd apps/mobile
flutter pub get
flutter run --dart-define=MADANI_API_URL=http://10.0.2.2:8000/api/v1
```

Gunakan `10.0.2.2` untuk Android emulator. Untuk device fisik, ganti dengan IP LAN komputer yang menjalankan Laravel API.

Default akun demo lokal:

- `admin@madani-nidham.local` / `password`
- `guru@madani-nidham.local` / `password`
- `ortu@madani-nidham.local` / `password`

Ganti atau nonaktifkan akun demo sebelum deploy production.

## Modul Utama

- Auth email/password, Google link/login opsional, session cache per user.
- Dashboard ringkasan akademik, keuangan, agenda, pengumuman, dan item tindak lanjut.
- Murid, kelas, orang tua, user, role, dan permission.
- Absensi, perizinan, jurnal, Montessori, hafalan/doa, portofolio, galeri, raport.
- PPDB publik, cek status, review admin, dan convert ke murid aktif.
- SPP, uang pendaftaran, rekening sekolah, kas manual, gaji guru, pusat keuangan, audit.
- Mobile parent app dengan ownership check per anak.
- AI internal berbasis data sistem, kuota, history, dan guard pertanyaan di luar konteks.

## Performance

Dashboard menargetkan pindah menu terasa instan di production build:

- Link prefetch Next.js aktif.
- Route/chunk menu dipanaskan setelah login.
- Data menu umum di-prefetch dengan queue kecil agar API tidak kebanjiran.
- Cache TanStack Query dipisah per session dan dibersihkan saat login/logout/401.
- Payload user dari login langsung dimasukkan ke cache agar tidak fetch `/auth/me` ulang.

Catatan: target `<100ms` harus diuji di `npm run start`, bukan `npm run dev`.

## Security

- Semua upload lewat validasi MIME, ukuran maksimum, nama file UUID, dan folder tersanitasi.
- Error API dan frontend memakai pesan user-friendly, tidak membocorkan output sistem.
- Role/permission wajib dicek di API, bukan hanya UI.
- AI menolak pertanyaan di luar konteks sistem sekolah meski diawali sapaan.

## PPDB Publik

Halaman PPDB ada di repo website publik lama `madani-montessori`:

- `/ppdb`
- `/ppdb/daftar`
- `/ppdb/cek-status`

Set `MADANI_NIDHAM_API_URL` di `.env` website lama agar form publik submit ke API Madani Nidham.

## Google OAuth

Login Google opsional untuk production. Isi `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, dan `GOOGLE_ALLOWED_REDIRECT_URIS`. User harus login email-password dulu, buka profil, lalu verifikasi Google. Login Google hanya aktif bila email Google sama dan verified.

Mobile Google Sign-In butuh OAuth client Android/iOS, SHA-1 Android, bundle ID iOS, dan deep link callback sebelum diaktifkan penuh.

## Dokumen

- [API](docs/api.md)
- [Database](docs/database.md)
- [Deployment](docs/deployment.md)
- [Runbook lokal](docs/local-web-runbook.md)
- [Mobile parent app](docs/mobile-parent-app.md)

## Known Issues

- Integrasi PSrE asli belum aktif. Field dan status sudah siap, provider dipilih setelah credential/kontrak tersedia.
- Cloudinary dan FCM masih env-gated. Local fallback berjalan tanpa credential.
- API lokal `php artisan serve` single-process bisa terasa lambat saat banyak request paralel. Gunakan production web build dan queue prefetch kecil untuk pengujian UI.
