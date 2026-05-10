# Local Web Runbook

Panduan cepat buat buka dashboard lokal dan benerin kasus halaman polos/stuck seperti `Madani Nidham - Membuka dashboard`.

## URL Lokal

Pakai salah satu host secara konsisten:

- Web: `http://127.0.0.1:3000`
- API: `http://127.0.0.1:8000/api/v1`

Kalau buka `http://localhost:3000`, pastikan API URL juga cocok. Campur `localhost` dan `127.0.0.1` bisa kena CORS kalau env belum lengkap.

## Jalankan API

Buka terminal pertama:

```powershell
$REPO = "C:\path\to\madani-nidham"
cd "$REPO\apps\api"
php artisan serve --host=127.0.0.1 --port=8000
```

Cek API:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/api/v1/health
```

Kalau route health tidak ada, cukup pastikan port listen:

```powershell
Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
```

## Jalankan Web

Buka terminal kedua:

```powershell
$REPO = "C:\path\to\madani-nidham"
cd "$REPO\apps\web"
npm install
npm run dev
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

Akun lokal:

```txt
admin@madani-nidham.local / password
guru@madani-nidham.local / password
ortu@madani-nidham.local / password
```

## Kalau Halaman Polos/Stuck

Gejala:

- cuma muncul `Madani Nidham`
- muncul `Membuka dashboard.`
- CSS hilang
- tombol login disabled terus
- browser console ada CORS error
- request `_next/static/...` status `404`

Langkah:

1. Buka langsung `http://127.0.0.1:3000/login`.
2. Pastikan API jalan di port `8000`.
3. Pastikan web jalan dari folder `apps/web`, bukan root repo.
4. Stop server web stale:

```powershell
$conn = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" } | Select-Object -First 1
if ($conn) { Stop-Process -Id $conn.OwningProcess -Force }
```

5. Start ulang:

```powershell
cd "$REPO\apps\web"
npm run dev
```

Kalau barusan menjalankan `npm run build` saat server dev masih hidup, bersihkan cache dev dulu:

```powershell
cd "$REPO"
$conn = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" } | Select-Object -First 1
if ($conn) { Stop-Process -Id $conn.OwningProcess -Force }
Remove-Item -LiteralPath "apps\web\.next" -Recurse -Force -ErrorAction SilentlyContinue
cd "apps\web"
npm run dev -- --hostname 127.0.0.1 --port 3000
```

## Kalau Error `package.json` Tidak Ketemu

Artinya `npm run dev` dijalankan dari root repo. Pindah ke folder web:

```powershell
cd "$REPO\apps\web"
npm run dev
```

## Kalau CORS Error

Pastikan `apps/api/.env` punya origin lokal:

```env
SANCTUM_STATEFUL_DOMAINS=localhost:3000,127.0.0.1:3000,localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000
```

Lalu restart API:

```powershell
php artisan config:clear
php artisan serve --host=127.0.0.1 --port=8000
```

## Validasi Sebelum Anggap Bug Selesai

Jalankan:

```powershell
cd "$REPO\apps\api"
php artisan test
```

```powershell
cd "$REPO\apps\web"
npm run lint
npx tsc --noEmit
npm run build
```

## Catatan

- Root `/` sekarang redirect server-side ke `/login`, bukan nunggu JavaScript.
- Kalau sudah login dan mau langsung dashboard, buka `http://127.0.0.1:3000/dashboard`.
- Kalau ganti `.env`, restart server yang terkait.
