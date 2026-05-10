<?php

namespace Tests\Feature;

use App\Models\Registration;
use App\Models\SchoolClass;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RegistrationFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
    }

    public function test_public_registration_can_be_checked_and_converted(): void
    {
        $response = $this->postJson('/api/v1/registrations', [
            'childName' => 'Muhammad Adam',
            'childBirthDate' => '2021-08-09',
            'childGender' => 'L',
            'programApplied' => 'TK A',
            'parentName' => 'Bunda Adam',
            'parentPhone' => '000000000100',
            'parentEmail' => 'bunda.adam@example.test',
            'address' => 'Tangerang',
        ]);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['registrationNumber']]);

        $number = $response->json('data.registrationNumber');

        $this->getJson('/api/v1/registrations/check/'.$number)
            ->assertOk()
            ->assertJsonPath('data.status', 'pending');

        Sanctum::actingAs(User::where('email', 'admin@madani-nidham.local')->first());
        $class = SchoolClass::firstOrFail();
        $registration = Registration::where('registration_number', $number)->firstOrFail();

        $this->postJson('/api/v1/registrations/'.$registration->id.'/convert', [
            'classId' => $class->id,
            'nis' => 'MDN-999',
        ])->assertOk()
            ->assertJsonPath('data.registration.status', 'accepted')
            ->assertJsonPath('data.student.nis', 'MDN-999');
    }
}
