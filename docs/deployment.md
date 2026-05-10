# Deployment Notes

Target domain:

- API: `https://api.madanimontessori.online/api/v1`
- Dashboard: `https://dashboard.madanimontessori.online`
- Website publik: `https://madanimontessori.online`

Environment penting API:

```env
APP_URL=https://api.madanimontessori.online
SANCTUM_STATEFUL_DOMAINS=dashboard.madanimontessori.online
CORS_ALLOWED_ORIGINS=https://dashboard.madanimontessori.online,https://madanimontessori.online
```

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
