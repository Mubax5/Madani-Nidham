# Deployment Notes

Target domain:

- API: `https://api.madanimontessori.online/api/v1`
- Dashboard: `https://dashboard.madanimontessori.online`
- Website publik: `https://madanimontessori.online`

Environment penting API:

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

Google OAuth manual:

1. Buka Google Cloud Console.
2. Buat OAuth Client ID tipe Web application.
3. Tambahkan Authorized redirect URI: `https://dashboard.madanimontessori.online/login`.
4. Salin Client ID ke `GOOGLE_CLIENT_ID`.
5. Salin Client Secret ke `GOOGLE_CLIENT_SECRET`.
6. Isi `GOOGLE_REDIRECT_URI` dan `GOOGLE_ALLOWED_REDIRECT_URIS` dengan URL login dashboard.
7. Setelah deploy, user login email-password dulu, buka profil dari avatar kanan atas, lalu verifikasi Google. Login Google hanya aktif jika email Google sama dan sudah verified.

Environment penting website lama:

```env
MADANI_NIDHAM_API_URL=https://api.madanimontessori.online/api/v1
```

Checklist deploy:

1. Jalankan migration dan seed API.
2. Jalankan `php artisan storage:link`.
3. Set CORS + Sanctum domain produksi.
4. Build dashboard Next.
5. Deploy perubahan website lama agar `/ppdb*` aktif.
6. Pastikan akun demo tidak dipakai production.
7. Pastikan `.env` production tidak masuk Git.
8. Jalankan `php artisan config:cache`. Jangan jalankan `route:cache` sebelum closure route dipindah ke controller.
9. Jalankan `npm run build` untuk dashboard.
