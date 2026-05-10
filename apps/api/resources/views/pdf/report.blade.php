<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>Raport {{ $report->student->full_name }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; color: #111827; font-size: 12px; line-height: 1.55; }
        .header { border-bottom: 4px solid #f5c542; padding-bottom: 16px; margin-bottom: 20px; }
        .brand { color: #0a1f5c; font-size: 24px; font-weight: bold; margin: 0; }
        .subtitle { color: #64748b; margin: 4px 0 0; }
        .panel { border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; margin-bottom: 14px; }
        .title { color: #0a1f5c; font-size: 16px; font-weight: bold; margin: 0 0 8px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; vertical-align: top; }
        th { background: #fff7e6; color: #0a1f5c; }
        .grid { width: 100%; }
        .grid td { border: 0; padding: 3px 0; }
        .sign { margin-top: 28px; width: 260px; margin-left: auto; text-align: center; }
        .signature-img { height: 72px; max-width: 220px; object-fit: contain; margin: 10px auto; }
        .disclaimer { color: #b45309; font-size: 10px; margin-top: 8px; }
    </style>
</head>
<body>
    <header class="header">
        <h1 class="brand">Madani Nidham</h1>
        <p class="subtitle">Raport Perkembangan Montessori - {{ $report->academicYear->name }} Semester {{ $report->semester }}</p>
    </header>

    <section class="panel">
        <h2 class="title">Data Murid</h2>
        <table class="grid">
            <tr><td>Nama</td><td>: {{ $report->student->full_name }}</td><td>Kelas</td><td>: {{ $report->class->name }}</td></tr>
            <tr><td>NIS</td><td>: {{ $report->student->nis ?: '-' }}</td><td>Tahun Ajaran</td><td>: {{ $report->academicYear->name }}</td></tr>
            <tr><td>Tanggal Lahir</td><td>: {{ optional($report->student->birth_date)->format('d-m-Y') }}</td><td>Semester</td><td>: {{ $report->semester }}</td></tr>
        </table>
    </section>

    <section class="panel">
        <h2 class="title">Perkembangan Montessori</h2>
        <table>
            <thead>
                <tr>
                    <th>Area</th>
                    <th>Milestone</th>
                    <th>Status</th>
                    <th>Catatan</th>
                </tr>
            </thead>
            <tbody>
                @forelse ($milestones as $item)
                    <tr>
                        <td>{{ $item->milestone->area->name }}</td>
                        <td>{{ $item->milestone->name }}</td>
                        <td>{{ str_replace('_', ' ', $item->status) }}</td>
                        <td>{{ $item->observation_notes ?: '-' }}</td>
                    </tr>
                @empty
                    <tr><td colspan="4">Milestone belum diisi.</td></tr>
                @endforelse
            </tbody>
        </table>
    </section>

    <section class="panel">
        <h2 class="title">Rekap Kehadiran</h2>
        <p>Hadir: {{ $attendance['hadir'] ?? 0 }} | Izin: {{ $attendance['izin'] ?? 0 }} | Sakit: {{ $attendance['sakit'] ?? 0 }} | Alfa: {{ $attendance['alfa'] ?? 0 }}</p>
    </section>

    <section class="panel">
        <h2 class="title">Catatan Wali Kelas</h2>
        <p><strong>Umum:</strong> {{ $report->general_notes ?: '-' }}</p>
        <p><strong>Karakter:</strong> {{ $report->character_notes ?: '-' }}</p>
        <p><strong>Rekomendasi:</strong> {{ $report->recommendation ?: '-' }}</p>
    </section>

    <section class="sign">
        <p>{{ $principalTitle }}</p>
        @if ($signatureUrl)
            <img class="signature-img" src="{{ $signatureUrl }}" alt="Tanda tangan kepala sekolah">
        @else
            <div style="height:72px"></div>
        @endif
        <strong>{{ $principalName }}</strong>
        <p class="disclaimer">{{ $signatureDisclaimer }}</p>
    </section>
</body>
</html>
