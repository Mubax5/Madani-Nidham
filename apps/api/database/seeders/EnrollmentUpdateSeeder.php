<?php

namespace Database\Seeders;

use App\Models\AcademicYear;
use App\Models\EnrollmentUpdate;
use App\Models\Registration;
use App\Models\Student;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class EnrollmentUpdateSeeder extends Seeder
{
    public function run(): void
    {
        $year = AcademicYear::firstOrCreate(
            ['name' => '2026/2027'],
            ['start_date' => '2026-07-01', 'end_date' => '2027-06-30', 'is_active' => true],
        );

        EnrollmentUpdate::where('academic_year_id', $year->id)->delete();

        $rows = [
            ['new_student', 'Salman', 'KB', 'GMC Blok A2', 5850000, 5850000, 'Salman, gmc blok a2. Dp 2jt -> 5.850.000 (lunas)'],
            ['new_student', 'Haura', 'KB', 'GMC Blok A2', 5800000, 5800000, 'Haura, gmc blok a2. Dp 2 jt -> 5.800.000 (lunas)'],
            ['new_student', 'Aisyah', 'KB', 'Korpri Blok E', 5800000, 5800000, 'Aisyah, korpri blok e, 5.800.000 (lunas)'],
            ['new_student', 'Arkana Khayril Akmal', 'KB', null, 5800000, 5800000, 'Arkana Khayril Akmal, 5.800.000 (lunas)'],
            ['new_student', 'Izqian Faeyza Arayya', 'KB', null, 5800000, 5800000, 'Izqian Faeyza Arayya 5.800.000 (lunas)'],
            ['new_student', 'Mahira', 'KB', null, 5660000, 5660000, 'Mahira DP 1,8 jt +3,860.000 (lunas)'],
            ['new_student', 'Kaivan', 'KB', null, 5600000, 5600000, 'Kaivan 5.600.000 (lunas)'],
            ['new_student', 'Rayn', 'KB', null, 5800000, 5800000, 'Rayn 5.800.000 (lunas)'],
            ['new_student', 'Raline', 'KB', null, 5800000, 5800000, 'Raline 5.800.000 (lunas)'],
            ['new_student', 'Encarna', 'KB', null, 5850000, 5850000, 'Encarna 5.850.000 (lunas)'],
            ['new_student', 'Lathifa', 'KB', null, 5850000, 0, 'Lathifa 5.850.000'],
            ['new_student', 'Aara Shadia Ramdani', 'KB', null, null, 0, 'Aara Shadia Ramdani'],
            ['new_student', 'Arkana Wafi', 'KB', null, null, 0, 'Arkana Wafi'],
            ['new_student', 'Mickhayla', 'TK A', null, null, 2000000, 'Mickhayla TK A. DP 2jt'],
            ['re_registration', 'Barra', 'TK A', null, 4450000, 4450000, 'Barra daftar ulang 4.450.000 (lunas)'],
            ['re_registration', 'Rama', 'TK A', null, 3850000, 3850000, 'Rama 1jt+ 2.850.000 (lunas)'],
            ['re_registration', 'Hilya', 'TK A', null, null, 0, 'Hilya'],
            ['re_registration', 'Zafran', 'TK A', null, null, 1000000, 'Zafran 1 jt'],
            ['re_registration', 'Afkar', 'TK A', null, 3850000, 3850000, 'Afkar 1 jt 2.850.000 (lunas)'],
            ['re_registration', 'Haura Beniing', 'TK A', null, null, 1000000, 'Haura Beniing 1 jt'],
            ['re_registration', 'Hilmi', 'TK A', null, 3850000, 3850000, 'Hilmi 1 jt 2.850.000 (lunas)'],
            ['re_registration', 'Azra', 'TK A', null, null, 1000000, 'Azra 1 jt'],
            ['re_registration', 'Nayyara', 'TK A', null, 3900000, 3900000, 'Nayyara 3.900.000 (lunas)'],
            ['re_registration', 'Yusuf', 'TK A', null, null, 1000000, 'Yusuf 1 jt'],
            ['re_registration', 'Harun', 'TK A', null, null, 1000000, 'Harun 1 jt'],
            ['re_registration', 'Alyssa', 'TK A', null, null, 1000000, 'Alyssa 1 jt'],
            ['re_registration', 'Tsabina', 'TK A', null, null, 1000000, 'Tsabina 1jt'],
            ['re_registration', 'Anya', 'TK A', null, null, 1000000, 'Anya 1 jt'],
            ['re_registration', 'Aretha Shanum', 'TK A', null, null, 1000000, 'Aretha Shanum 1 jt'],
            ['re_registration', 'Zayn', 'TK A', null, null, 1000000, 'Zayn 1 jt'],
            ['re_registration', 'Elby', 'TK A', null, null, 0, 'Elby'],
            ['re_registration', 'Shanum A', 'TK A', null, null, 0, 'Shanum A'],
            ['graduated', 'Sofia', 'TK B', null, null, 0, 'Sofia'],
            ['graduated', 'Nayla', 'TK B', null, null, 0, 'Nayla'],
            ['graduated', 'Areta Adiana', 'TK B', null, null, 0, 'Areta Adiana'],
            ['graduated', 'Queena', 'TK B', null, null, 0, 'Queena'],
            ['graduated', 'Khayyara', 'TK B', null, null, 0, 'Khayyara'],
            ['graduated', 'Fira', 'TK B', null, null, 0, 'Fira'],
            ['prep_class', 'Shanum A', 'TK C', null, null, 0, 'Shanum A lanjut kelas persiapan/TK C'],
            ['prep_class', 'Harun', 'TK C', null, null, 0, 'Harun lanjut kelas persiapan/TK C'],
        ];

        foreach ($rows as [$category, $name, $level, $address, $target, $paid, $source]) {
            $isFinancial = in_array($category, EnrollmentUpdate::FINANCIAL_CATEGORIES, true);

            EnrollmentUpdate::updateOrCreate(
                [
                    'academic_year_id' => $year->id,
                    'category' => $category,
                    'full_name' => $name,
                ],
                [
                    'student_id' => $this->studentId($name),
                    'registration_id' => $this->registrationId($name),
                    'program_level' => $level,
                    'address' => $address,
                    'target_amount' => $target,
                    'paid_amount' => $paid,
                    'payment_status' => $isFinancial ? $this->paymentStatus($target, $paid) : 'not_applicable',
                    'confirmation_status' => $this->confirmationStatus($category, $paid),
                    'source_text' => $source,
                ],
            );
        }
    }

    private function paymentStatus(?int $target, int $paid): string
    {
        if ($target !== null && $target > 0 && $paid >= $target) {
            return 'paid';
        }

        return $paid > 0 ? 'partial' : 'unpaid';
    }

    private function confirmationStatus(string $category, int $paid): string
    {
        return match ($category) {
            'graduated' => 'graduated',
            'prep_class' => 'continuing',
            default => $paid > 0 ? 'confirmed' : 'pending',
        };
    }

    private function studentId(string $name): ?int
    {
        $normalized = $this->normalize($name);

        return Student::get(['id', 'full_name', 'nickname'])
            ->first(fn (Student $student) => $this->normalize($student->full_name) === $normalized || $this->normalize($student->nickname ?? '') === $normalized)
            ?->id;
    }

    private function registrationId(string $name): ?int
    {
        $normalized = $this->normalize($name);

        return Registration::get(['id', 'child_name'])
            ->first(fn (Registration $registration) => $this->normalize($registration->child_name) === $normalized)
            ?->id;
    }

    private function normalize(?string $name): string
    {
        return Str::of($name ?? '')
            ->lower()
            ->replaceMatches('/[^a-z0-9]+/i', '')
            ->toString();
    }
}
