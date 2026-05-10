<?php

namespace Database\Seeders;

use App\Models\DoaDaily;
use Illuminate\Database\Seeder;

class DoaDailySeeder extends Seeder
{
    public function run(): void
    {
        $doas = [
            ['name' => 'Doa Sebelum Makan', 'category' => 'aktivitas_harian', 'arabic_text' => 'بسم الله وعلى بركة الله', 'latin_text' => 'Bismillahi wa ala barakatillah', 'meaning' => 'Dengan nama Allah dan atas berkah Allah'],
            ['name' => 'Doa Sesudah Makan', 'category' => 'aktivitas_harian', 'arabic_text' => 'الحمد لله الذي أطعمنا وسقانا وجعلنا مسلمين', 'latin_text' => "Alhamdulillahilladzi ath'amana wa saqana wa ja'alana muslimin", 'meaning' => 'Segala puji bagi Allah yang memberi makan dan minum serta menjadikan kami Muslim'],
            ['name' => 'Doa Sebelum Tidur', 'category' => 'aktivitas_harian', 'arabic_text' => 'باسمك اللهم أموت وأحيا', 'latin_text' => 'Bismikallahumma amutu wa ahya', 'meaning' => 'Dengan nama-Mu ya Allah, aku mati dan hidup'],
            ['name' => 'Doa Bangun Tidur', 'category' => 'aktivitas_harian', 'arabic_text' => 'الحمد لله الذي أحيانا بعدما أماتنا وإليه النشور', 'latin_text' => "Alhamdulillahilladzi ahyana ba'da ma amatana wa ilaihin nusyur", 'meaning' => 'Segala puji bagi Allah yang menghidupkan kami setelah mematikan kami'],
            ['name' => 'Doa Masuk Kamar Mandi', 'category' => 'aktivitas_harian', 'arabic_text' => 'اللهم إني أعوذ بك من الخبث والخبائث', 'latin_text' => "Allahumma inni a'udzubika minal khubutsi wal khabaits", 'meaning' => 'Ya Allah, aku berlindung kepada-Mu dari gangguan setan'],
            ['name' => 'Doa Keluar Kamar Mandi', 'category' => 'aktivitas_harian', 'arabic_text' => 'غفرانك', 'latin_text' => 'Ghufranaka', 'meaning' => 'Ampunan-Mu ya Allah'],
            ['name' => 'Doa Masuk Rumah', 'category' => 'aktivitas_harian', 'arabic_text' => 'اللهم إني أسألك خير المولج وخير المخرج', 'latin_text' => 'Allahumma inni as aluka khairal mawlaji wa khairal makhraji', 'meaning' => 'Ya Allah, aku meminta kebaikan saat masuk dan keluar'],
            ['name' => 'Doa Keluar Rumah', 'category' => 'aktivitas_harian', 'arabic_text' => 'بسم الله توكلت على الله ولا حول ولا قوة إلا بالله', 'latin_text' => "Bismillahi tawakkaltu alallah wala hawla wala quwwata illa billah", 'meaning' => 'Dengan nama Allah, aku bertawakal kepada Allah'],
            ['name' => 'Doa Bercermin', 'category' => 'aktivitas_harian', 'arabic_text' => 'اللهم كما حسنت خلقي فحسن خلقي', 'latin_text' => 'Allahumma kama hassanta khalqi fahassin khuluqi', 'meaning' => 'Ya Allah, sebagaimana Engkau memperindah tubuhku, perindahlah akhlakku'],
            ['name' => 'Doa Sebelum Belajar', 'category' => 'ibadah', 'arabic_text' => 'رب زدني علما وارزقني فهما', 'latin_text' => 'Rabbi zidni ilman warzuqni fahma', 'meaning' => 'Ya Allah, tambahkan ilmuku dan beri aku pemahaman'],
            ['name' => 'Doa Sesudah Belajar', 'category' => 'ibadah', 'arabic_text' => 'اللهم إني أستودعك ما علمتنيه', 'latin_text' => "Allahumma inni astaudi'uka ma allamtanih", 'meaning' => 'Ya Allah, aku titipkan kepada-Mu apa yang telah Engkau ajarkan'],
            ['name' => 'Doa Berpakaian', 'category' => 'aktivitas_harian', 'arabic_text' => 'الحمد لله الذي كساني هذا', 'latin_text' => 'Alhamdulillahilladzi kasani hadza', 'meaning' => 'Segala puji bagi Allah yang memberi pakaian ini'],
            ['name' => 'Doa Bersin', 'category' => 'adab', 'arabic_text' => 'الحمد لله', 'latin_text' => 'Alhamdulillah', 'meaning' => 'Segala puji bagi Allah'],
            ['name' => 'Doa Naik Kendaraan', 'category' => 'aktivitas_harian', 'arabic_text' => 'سبحان الذي سخر لنا هذا وما كنا له مقرنين', 'latin_text' => 'Subhanalladzi sakhkhara lana hadza wa ma kunna lahu muqrinin', 'meaning' => 'Maha Suci Allah yang menundukkan kendaraan ini untuk kami'],
            ['name' => 'Doa Untuk Kedua Orang Tua', 'category' => 'ibadah', 'arabic_text' => 'رب اغفر لي ولوالدي وارحمهما كما ربياني صغيرا', 'latin_text' => 'Rabbighfir li waliwalidayya warhamhuma kama rabbayani shaghira', 'meaning' => 'Ya Allah, ampunilah aku dan kedua orang tuaku'],
        ];

        foreach ($doas as $index => $doa) {
            DoaDaily::updateOrCreate(['name' => $doa['name']], [...$doa, 'sort_order' => $index + 1]);
        }
    }
}
