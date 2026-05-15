# Deployment Notes

Target domain:

- API: `https://api.madanimontessori.online/api/v1`
- Dashboard: `https://dashboard.madanimontessori.online`
- Website publik: `https://madanimontessori.online`

## Environment API

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.madanimontessori.online
SANCTUM_STATEFUL_DOMAINS=dashboard.madanimontessori.online
CORS_ALLOWED_ORIGINS=https://dashboard.madanimontessori.online,https://madanimontessori.online
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://dashboard.madanimontessori.online/login
GOOGLE_ALLOWED_REDIRECT_URIS=https://dashboard.madanimontessori.online/login
AI_GLOBAL_DAILY_REQUESTS=1500
AI_GLOBAL_TOKENS_PER_MINUTE=800000
```

Set `APP_DEBUG=false` wajib. Error production harus memakai pesan user-friendly.

## Environment Dashboard

```env
NEXT_PUBLIC_APP_NAME="Madani Nidham"
NEXT_PUBLIC_API_URL=https://api.madanimontessori.online/api/v1
```

## Environment Website Publik

```env
MADANI_NIDHAM_API_URL=https://api.madanimontessori.online/api/v1
```

## Build

API:

```bash
cd apps/api
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan storage:link
php artisan optimize
```

Dashboard:

```bash
cd apps/web
npm ci
npm run build
npm run start
```

Install `sharp` di production dashboard bila image optimization Next dipakai:

```bash
cd apps/web
npm install sharp
```

## Google OAuth

1. Buka Google Cloud Console.
2. Buat OAuth Client ID tipe Web application.
3. Tambahkan Authorized redirect URI: `https://dashboard.madanimontessori.online/login`.
4. Salin Client ID ke `GOOGLE_CLIENT_ID`.
5. Salin Client Secret ke `GOOGLE_CLIENT_SECRET`.
6. Isi `GOOGLE_REDIRECT_URI` dan `GOOGLE_ALLOWED_REDIRECT_URIS`.
7. Deploy API dan dashboard.
8. User login email-password dulu, buka profil, lalu verifikasi Google.

Login Google hanya aktif jika email Google sama dengan email akun dan sudah verified.

## Upload

- Jalankan `php artisan storage:link`.
- Pastikan folder `storage/app/public` writable.
- Validasi upload sudah di backend: MIME whitelist, UUID filename, folder tersanitasi, max 5 MB.
- Jika pindah ke S3/Cloudinary, update disk/adapter tanpa melewati validasi backend.

## Performance

Dashboard production harus diuji dengan `npm run start`, bukan `npm run dev`.

Checklist:

1. `npm run build` sukses.
2. Route prefetch Next aktif.
3. Data prefetch dashboard berjalan queue kecil, bukan paralel besar.
4. Login payload mengisi cache `/auth/me`.
5. Query cache dibersihkan saat login/logout/401.
6. API menjalankan `php artisan optimize` setelah env final.

Target pindah menu web: `<100ms` untuk route commit setelah bundle/data dipanaskan.

## AI

Production AI guard wajib:

- Jawab hanya konteks sistem Madani Nidham.
- Tolak pertanyaan luar konteks, termasuk mixed prompt yang diawali sapaan.
- Jangan tampilkan raw provider error ke user.
- Kuota global dikontrol lewat env `AI_GLOBAL_DAILY_REQUESTS` dan `AI_GLOBAL_TOKENS_PER_MINUTE`.

## Checklist Deploy

1. Set env production.
2. Pastikan `.env` production tidak masuk Git.
3. `composer install --no-dev --optimize-autoloader`.
4. `php artisan migrate --force`.
5. `php artisan storage:link`.
6. `php artisan optimize`.
7. `npm ci && npm run build` di `apps/web`.
8. Deploy website publik agar `/ppdb*` submit ke API baru.
9. Hapus/nonaktifkan akun demo.
10. Tes login role super admin, guru, orang tua.
11. Tes upload foto/dokumen.
12. Tes AI out-of-scope.
13. Tes pembayaran SPP, uang pendaftaran, kas manual, dan gaji guru masuk pusat keuangan.

## Rollback / Perubahan Env

Jika env berubah:

```bash
php artisan optimize:clear
php artisan optimize
```

Jika deploy frontend stale:

```bash
cd apps/web
rm -rf .next
npm run build
npm run start
```
