<?php

namespace Database\Seeders;

use App\Models\ParentingArticle;
use App\Models\User;
use Illuminate\Database\Seeder;

class ParentingArticlesSampleSeeder extends Seeder
{
    public function run(): void
    {
        $creatorId = User::role('super_admin')->value('id') ?? User::value('id');
        if (! $creatorId) {
            return;
        }

        $articles = [
            ['title' => 'Menyiapkan Rutinitas Pagi yang Tenang', 'category' => 'aktivitas_rumah', 'content' => 'Bangun rutinitas pendek, konsisten, dan mudah diikuti anak. Pilih tiga langkah utama: bangun, mandi, sarapan. Gunakan bahasa singkat dan beri anak pilihan kecil agar ia merasa mampu.'],
            ['title' => 'Latihan Practical Life di Rumah', 'category' => 'montessori', 'content' => 'Kegiatan menuang, melipat, merapikan mainan, dan menyapu kecil melatih koordinasi serta kemandirian. Siapkan alat ukuran anak dan beri waktu tanpa terburu-buru.'],
            ['title' => 'Mengenalkan Adab Makan', 'category' => 'islami', 'content' => 'Adab makan dapat dilatih lewat contoh orang dewasa. Mulai dari membaca doa, duduk rapi, memakai tangan kanan, dan mengucapkan hamdalah setelah selesai.'],
            ['title' => 'Bekal Sehat untuk Anak TK', 'category' => 'nutrisi', 'content' => 'Pilih kombinasi karbohidrat, protein, buah, dan air putih. Hindari porsi terlalu besar agar anak nyaman menghabiskan bekal.'],
            ['title' => 'Menghadapi Anak Sulit Berpisah di Gerbang', 'category' => 'tumbuh_kembang', 'content' => 'Buat ritual perpisahan singkat dan konsisten. Validasi perasaan anak, lalu sampaikan kapan orang tua kembali menjemput.'],
        ];

        foreach ($articles as $article) {
            ParentingArticle::updateOrCreate(['title' => $article['title']], [
                ...$article,
                'relevant_areas' => [],
                'relevant_levels' => ['KB', 'TK A', 'TK B', 'TK C'],
                'is_published' => true,
                'published_at' => now(),
                'created_by' => $creatorId,
            ]);
        }
    }
}
