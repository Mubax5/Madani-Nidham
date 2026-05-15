# Local Web Runbook

Panduan cepat menjalankan dashboard lokal, API lokal, dan mengecek performa pindah menu.

## URL Lokal

Pakai host secara konsisten:

- Web: `http://127.0.0.1:3000`
- API: `http://127.0.0.1:8000/api/v1`

Jangan campur `localhost` dan `127.0.0.1` kalau CORS/env belum disamakan.

## Jalankan API

```powershell
$REPO = "C:\path\to\madani-nidham"
cd "$REPO\apps\api"
php artisan serve --host=127.0.0.1 --port=8000
```

Cek port:

```powershell
Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
```

## Jalankan Web Dev

```powershell
$REPO = "C:\path\to\madani-nidham"
cd "$REPO\apps\web"
npm install
npm run dev -- --hostname 127.0.0.1 --port 3000
```

File `apps/web/.env.local` minimal:

```env
NEXT_PUBLIC_APP_NAME="Madani Nidham"
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1
```

Buka:

```txt
http://127.0.0.1:3000/login
```

## Jalankan Web Production Lokal

Untuk cek performa, pakai production build:

```powershell
cd "$REPO\apps\web"
npm run build
npm run start -- --hostname 127.0.0.1 --port 3000
```

Next.js prefetch production tidak akurat jika dites dari `npm run dev`.

## Akun Lokal

```txt
admin@madani-nidham.local / password
guru@madani-nidham.local / password
ortu@madani-nidham.local / password
```

## Stop Server

```powershell
foreach ($port in 3000,8000) {
  Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
    Where-Object { $_.State -eq "Listen" } |
    Select-Object -ExpandProperty OwningProcess -Unique |
    ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
}
```

## Kalau Halaman Polos/Stuck

Gejala:

- cuma muncul `Madani Nidham`
- tombol login disabled terus
- CSS hilang
- browser console CORS error
- request `_next/static/...` 404

Langkah:

1. Buka langsung `http://127.0.0.1:3000/login`.
2. Pastikan API jalan di `127.0.0.1:8000`.
3. Pastikan `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1`.
4. Pastikan web dijalankan dari folder `apps/web`.
5. Stop server stale di port `3000`.
6. Jika `.next` rusak, hapus lalu build/start ulang:

```powershell
cd "$REPO"
Remove-Item -LiteralPath "apps\web\.next" -Recurse -Force -ErrorAction SilentlyContinue
cd "apps\web"
npm run build
npm run start -- --hostname 127.0.0.1 --port 3000
```

## Kalau CORS Error

Pastikan `apps/api/.env`:

```env
SANCTUM_STATEFUL_DOMAINS=localhost:3000,127.0.0.1:3000,dashboard.madanimontessori.online
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000,https://dashboard.madanimontessori.online,https://madanimontessori.online
```

Lalu:

```powershell
cd "$REPO\apps\api"
php artisan optimize:clear
php artisan serve --host=127.0.0.1 --port=8000
```

## Kalau Data Akun Lama Kebawa

Harusnya sudah dicegah:

- session query key dibuat dari token,
- QueryClient clear saat login/logout/401,
- login payload langsung mengisi cache `/auth/me`.

Kalau masih terjadi di browser lama:

1. Logout.
2. Buka DevTools -> Application -> Local Storage.
3. Hapus `madani_token` dan `madani_session_key`.
4. Login ulang.

## Kalau Pindah Menu Lambat

Pastikan:

1. Web jalan dengan `npm run start`, bukan `npm run dev`.
2. Tidak ada request API berat yang masih antre dari tes sebelumnya.
3. API tidak ditembak prefetch paralel besar.
4. Setelah login tunggu 2-3 detik agar route/chunk/data menu dipanaskan.
5. Uji klik menu lagi.

Implementasi sekarang:

- Next Link prefetch aktif.
- `router.prefetch()` dipanggil saat idle, hover, focus, click.
- Bundle page besar dipanaskan setelah login.
- Data umum menu di-prefetch dengan queue kecil dan response endpoint yang sama di-reuse.

## Google OAuth Lokal

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://127.0.0.1:3000/login
GOOGLE_ALLOWED_REDIRECT_URIS=http://127.0.0.1:3000/login,http://localhost:3000/login
```

Di Google Cloud Console:

1. Buat OAuth client tipe `Web application`.
2. Isi Authorized JavaScript origins: `http://127.0.0.1:3000`, `http://localhost:3000`.
3. Isi Authorized redirect URIs: `http://127.0.0.1:3000/login`, `http://localhost:3000/login`.
4. Jalankan `php artisan optimize:clear`, lalu restart API.

## Validasi

API:

```powershell
cd "$REPO\apps\api"
php artisan test
```

Web:

```powershell
cd "$REPO\apps\web"
npm run lint
npm run build
```

Smoke:

- login super admin,
- login guru setelah super admin untuk cek cache role,
- buka dashboard, murid, absensi, jurnal, Montessori, hafalan, portofolio, raport,
- buka SPP, pusat keuangan, pengaturan keuangan,
- upload foto profil/dokumen,
- chat AI dengan pertanyaan luar konteks harus ditolak.
