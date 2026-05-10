<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthAndDashboardTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
    }

    public function test_admin_can_login_and_view_dashboard(): void
    {
        $login = $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@madani-nidham.local',
            'password' => 'password',
        ]);

        $login->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.user.email', 'admin@madani-nidham.local')
            ->assertJsonStructure(['data' => ['token']]);

        $this->withToken($login->json('data.token'))
            ->getJson('/api/v1/dashboard')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['totalActiveStudents', 'totalClasses', 'pendingRegistrations']]);
    }

    public function test_invalid_login_returns_indonesian_error(): void
    {
        $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@madani-nidham.local',
            'password' => 'wrong-password',
        ])->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Email atau password tidak valid.');
    }
}
