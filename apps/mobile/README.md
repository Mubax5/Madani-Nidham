# Madani Nidham Parent App

Flutter app untuk role `orang_tua`. App memakai Laravel API Madani Nidham yang sama dengan dashboard web.

## Fitur

- Login email/password.
- Beranda ringkas: anak, absensi hari ini, izin/sakit, jurnal terbaru, pengumuman, agenda, tagihan, notifikasi.
- Data anak: biodata, kelas aktif, program, raport publish, portofolio.
- Aktivitas: absensi, jurnal, Montessori, hafalan/doa, form izin/sakit.
- Tagihan: ringkasan SPP, daftar tagihan, upload bukti bayar.
- Info sekolah: pengumuman, agenda, galeri kelas, artikel parenting, notifikasi.
- AI Anak: chat berdasarkan data anak yang terhubung ke akun orang tua.

## Run Local

API:

```bash
cd ../api
php artisan serve --host=0.0.0.0 --port=8000
```

Mobile:

```bash
cd ../mobile
flutter pub get
flutter run --dart-define=MADANI_API_URL=http://10.0.2.2:8000/api/v1
```

URL:

- Android emulator: `http://10.0.2.2:8000/api/v1`
- iOS simulator: `http://127.0.0.1:8000/api/v1`
- HP fisik: `http://IP-LAN-KOMPUTER:8000/api/v1`

Demo lokal:

```txt
ortu@madani-nidham.local / password
```

## Build APK Debug

```bash
flutter build apk --debug --dart-define=MADANI_API_URL=http://IP-LAN-KOMPUTER:8000/api/v1
```

Pastikan API dijalankan dengan `--host=0.0.0.0` dan firewall membuka port `8000`.

## Google Login

Backend sudah punya flow Google OAuth untuk dashboard. Mobile butuh konfigurasi manual sebelum aktif penuh:

- OAuth client Android di Google Cloud.
- SHA-1 signing certificate Android.
- OAuth client iOS dengan bundle ID app.
- Deep link callback mobile yang didaftarkan di backend `GOOGLE_ALLOWED_REDIRECT_URIS`.

Sampai konfigurasi itu ada, login email/password tetap menjadi flow utama.

## Security

- Token disimpan via `flutter_secure_storage`.
- Endpoint mobile parent dibatasi oleh relasi `student_parents`.
- User orang tua tidak boleh membuka data anak lain.
- Upload bukti bayar divalidasi backend.
