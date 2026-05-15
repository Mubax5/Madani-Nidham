# Mobile App Orang Tua - Madani Nidham

Flutter app untuk role `orang_tua`. App mengambil data dari Laravel API yang sama dengan dashboard web.

## Tujuan

- Orang tua melihat data anak dari ponsel.
- Orang tua mengirim izin/sakit.
- Orang tua melihat jurnal, absensi, Montessori, hafalan/doa, portofolio, galeri, raport, tagihan, pengumuman, agenda, artikel parenting, dan notifikasi.
- AI anak hanya menjawab berdasarkan data anak yang terhubung ke akun orang tua.

## Integrasi Data

Auth memakai bearer token Sanctum dari `POST /auth/login`.

Data parent dibatasi lewat pivot `student_parents`. Endpoint mobile wajib menolak akses ke `studentId` yang tidak terhubung dengan user.

Endpoint utama:

- `POST /auth/login`
- `POST /auth/logout`
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
- `POST /absence-requests`
- `POST /fees/{feeId}/payments`
- `GET /ai/chat/my-history?studentId={studentId}`
- `POST /ai/chat`

## Struktur App

```txt
apps/mobile/
  lib/
    core/
      api_client.dart
      ui.dart
    screens/
      login_screen.dart
      home_shell.dart
    main.dart
```

## Run Local

API:

```bash
cd apps/api
php artisan migrate --seed
php artisan serve --host=0.0.0.0 --port=8000
```

Flutter:

```bash
cd apps/mobile
flutter pub get
flutter run --dart-define=MADANI_API_URL=http://10.0.2.2:8000/api/v1
```

URL:

- Android emulator: `http://10.0.2.2:8000/api/v1`
- iOS simulator: `http://127.0.0.1:8000/api/v1`
- HP fisik: `http://IP_LAN_KOMPUTER:8000/api/v1`

## Build APK untuk HP Fisik

1. Cek IP laptop:

```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '169.254*' -and $_.IPAddress -ne '127.0.0.1' }
```

2. Jalankan API di semua interface:

```powershell
cd apps/api
php artisan serve --host=0.0.0.0 --port=8000
```

3. Pastikan browser HP bisa membuka API:

```txt
http://IP_LAPTOP:8000/api/v1/mobile/parent/home
```

Endpoint itu butuh auth, jadi 401/403 berarti server bisa dijangkau. Timeout berarti jaringan/firewall bermasalah.

4. Build APK:

```powershell
cd apps/mobile
flutter build apk --debug --dart-define=MADANI_API_URL=http://IP_LAPTOP:8000/api/v1
```

5. Share APK:

```powershell
cd apps/mobile/build/app/outputs/flutter-apk
python -m http.server 5520 --bind 0.0.0.0
```

Buka dari HP:

```txt
http://IP_LAPTOP:5520/app-debug.apk
```

## Kalau Login Muter Terus

Penyebab paling sering: APK dibuild dengan IP lama. APK tidak otomatis tahu IP laptop berubah.

Cek:

- HP dan laptop satu jaringan.
- `MADANI_API_URL` saat build sama dengan IP yang bisa diakses HP.
- API jalan dengan `--host=0.0.0.0`.
- Windows Firewall membuka port `8000`.

Buka firewall Windows:

```powershell
netsh advfirewall firewall add rule name="Madani Nidham API 8000" dir=in action=allow protocol=TCP localport=8000
```

## Akun Demo

```txt
ortu@madani-nidham.local / password
```

Ganti akun demo sebelum production.

## Security

- Token disimpan via `flutter_secure_storage`.
- Cache profil non-sensitif boleh memakai `shared_preferences`.
- Endpoint mobile parent wajib ownership check.
- Upload bukti bayar tetap divalidasi backend.
- Login Google mobile belum aktif penuh tanpa OAuth client Android/iOS, SHA-1 Android, bundle ID iOS, dan deep link callback.
