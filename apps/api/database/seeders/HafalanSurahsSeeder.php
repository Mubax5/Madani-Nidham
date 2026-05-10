<?php

namespace Database\Seeders;

use App\Models\HafalanSurah;
use Illuminate\Database\Seeder;

class HafalanSurahsSeeder extends Seeder
{
    public function run(): void
    {
        $surahs = [
            ['surah_number' => 1, 'name_arabic' => 'الفاتحة', 'name_latin' => 'Al-Fatihah', 'name_id' => 'Pembukaan', 'total_ayat' => 7, 'target_level' => 'KB', 'sort_order' => 0],
            ['surah_number' => 114, 'name_arabic' => 'الناس', 'name_latin' => 'An-Nas', 'name_id' => 'Manusia', 'total_ayat' => 6, 'target_level' => 'KB', 'sort_order' => 1],
            ['surah_number' => 113, 'name_arabic' => 'الفلق', 'name_latin' => 'Al-Falaq', 'name_id' => 'Waktu Subuh', 'total_ayat' => 5, 'target_level' => 'KB', 'sort_order' => 2],
            ['surah_number' => 112, 'name_arabic' => 'الإخلاص', 'name_latin' => 'Al-Ikhlas', 'name_id' => 'Kemurnian', 'total_ayat' => 4, 'target_level' => 'KB', 'sort_order' => 3],
            ['surah_number' => 111, 'name_arabic' => 'المسد', 'name_latin' => 'Al-Lahab', 'name_id' => 'Gejolak Api', 'total_ayat' => 5, 'target_level' => 'TKA', 'sort_order' => 4],
            ['surah_number' => 110, 'name_arabic' => 'النصر', 'name_latin' => 'An-Nasr', 'name_id' => 'Pertolongan', 'total_ayat' => 3, 'target_level' => 'TKA', 'sort_order' => 5],
            ['surah_number' => 109, 'name_arabic' => 'الكافرون', 'name_latin' => 'Al-Kafirun', 'name_id' => 'Orang Kafir', 'total_ayat' => 6, 'target_level' => 'TKA', 'sort_order' => 6],
            ['surah_number' => 108, 'name_arabic' => 'الكوثر', 'name_latin' => 'Al-Kautsar', 'name_id' => 'Nikmat Yang Berlimpah', 'total_ayat' => 3, 'target_level' => 'TKA', 'sort_order' => 7],
            ['surah_number' => 107, 'name_arabic' => 'الماعون', 'name_latin' => "Al-Ma'un", 'name_id' => 'Barang Berguna', 'total_ayat' => 7, 'target_level' => 'TKB', 'sort_order' => 8],
            ['surah_number' => 106, 'name_arabic' => 'قريش', 'name_latin' => 'Al-Quraisy', 'name_id' => 'Suku Quraisy', 'total_ayat' => 4, 'target_level' => 'TKB', 'sort_order' => 9],
            ['surah_number' => 105, 'name_arabic' => 'الفيل', 'name_latin' => 'Al-Fil', 'name_id' => 'Gajah', 'total_ayat' => 5, 'target_level' => 'TKB', 'sort_order' => 10],
            ['surah_number' => 104, 'name_arabic' => 'الهمزة', 'name_latin' => 'Al-Humazah', 'name_id' => 'Pengumpat', 'total_ayat' => 9, 'target_level' => 'TKB', 'sort_order' => 11],
            ['surah_number' => 103, 'name_arabic' => 'العصر', 'name_latin' => 'Al-Asr', 'name_id' => 'Waktu', 'total_ayat' => 3, 'target_level' => 'TKB', 'sort_order' => 12],
            ['surah_number' => 102, 'name_arabic' => 'التكاثر', 'name_latin' => 'At-Takasur', 'name_id' => 'Bermegah-megahan', 'total_ayat' => 8, 'target_level' => 'TKC', 'sort_order' => 13],
            ['surah_number' => 101, 'name_arabic' => 'القارعة', 'name_latin' => 'Al-Qariah', 'name_id' => 'Hari Kiamat', 'total_ayat' => 11, 'target_level' => 'TKC', 'sort_order' => 14],
            ['surah_number' => 100, 'name_arabic' => 'العاديات', 'name_latin' => 'Al-Adiyat', 'name_id' => 'Kuda Perang', 'total_ayat' => 11, 'target_level' => 'TKC', 'sort_order' => 15],
            ['surah_number' => 99, 'name_arabic' => 'الزلزلة', 'name_latin' => 'Az-Zalzalah', 'name_id' => 'Gempa Bumi', 'total_ayat' => 8, 'target_level' => 'TKC', 'sort_order' => 16],
            ['surah_number' => 98, 'name_arabic' => 'البينة', 'name_latin' => 'Al-Bayyinah', 'name_id' => 'Bukti Nyata', 'total_ayat' => 8, 'target_level' => 'TKC', 'sort_order' => 17],
            ['surah_number' => 97, 'name_arabic' => 'القدر', 'name_latin' => 'Al-Qadr', 'name_id' => 'Kemuliaan', 'total_ayat' => 5, 'target_level' => 'TKC', 'sort_order' => 18],
            ['surah_number' => 96, 'name_arabic' => 'العلق', 'name_latin' => 'Al-Alaq', 'name_id' => 'Segumpal Darah', 'total_ayat' => 19, 'target_level' => 'TKC', 'sort_order' => 19],
        ];

        foreach ($surahs as $surah) {
            HafalanSurah::updateOrCreate(['surah_number' => $surah['surah_number']], $surah);
        }
    }
}
