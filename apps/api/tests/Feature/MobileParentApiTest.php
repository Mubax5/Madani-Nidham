<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\Attendance;
use App\Models\Journal;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MobileParentApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
    }

    public function test_parent_mobile_home_is_scoped_to_own_children(): void
    {
        [$parent, $ownStudent, $otherStudent] = $this->parentWithChild();
        $class = $ownStudent->active_class;
        $teacher = User::role('guru')->firstOrFail();

        Attendance::create([
            'student_id' => $ownStudent->id,
            'class_id' => $class->id,
            'date' => now()->toDateString(),
            'status' => 'hadir',
            'recorded_by' => $teacher->id,
            'check_in_time' => '08:00',
        ]);

        Journal::create([
            'student_id' => $ownStudent->id,
            'class_id' => $class->id,
            'teacher_id' => $teacher->id,
            'date' => now()->toDateString(),
            'content' => 'Anak fokus mengikuti kegiatan practical life.',
            'mood' => 'happy',
            'activities' => ['Practical Life'],
            'photo_urls' => [],
            'is_published' => true,
        ]);

        Journal::create([
            'student_id' => $otherStudent->id,
            'class_id' => $otherStudent->active_class->id,
            'teacher_id' => $teacher->id,
            'date' => now()->toDateString(),
            'content' => 'Jurnal anak lain tidak boleh muncul.',
            'mood' => 'neutral',
            'activities' => [],
            'photo_urls' => [],
            'is_published' => true,
        ]);

        Announcement::create([
            'title' => 'Info kelas anak',
            'content' => 'Pengumuman target kelas.',
            'target' => 'class',
            'target_class_ids' => [$class->id],
            'target_user_ids' => [],
            'is_urgent' => false,
            'published_at' => now(),
            'published_by' => $teacher->id,
        ]);

        Announcement::create([
            'title' => 'Info user lain',
            'content' => 'Pengumuman private user lain.',
            'target' => 'specific_parents',
            'target_class_ids' => [],
            'target_user_ids' => [User::factory()->create()->id],
            'is_urgent' => false,
            'published_at' => now(),
            'published_by' => $teacher->id,
        ]);

        Sanctum::actingAs($parent);

        $this->getJson('/api/v1/mobile/parent/home')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.children.0.id', $ownStudent->id)
            ->assertJsonPath('data.today.attendance.0.studentId', $ownStudent->id)
            ->assertJsonFragment(['content' => 'Anak fokus mengikuti kegiatan practical life.'])
            ->assertJsonFragment(['title' => 'Info kelas anak'])
            ->assertJsonMissing(['fullName' => $otherStudent->full_name])
            ->assertJsonMissing(['title' => 'Info user lain']);
    }

    public function test_parent_cannot_open_unowned_child_mobile_endpoint(): void
    {
        [$parent, $ownStudent, $otherStudent] = $this->parentWithChild();
        Sanctum::actingAs($parent);

        $this->getJson('/api/v1/mobile/parent/children/'.$ownStudent->id)
            ->assertOk()
            ->assertJsonPath('data.id', $ownStudent->id);

        $this->getJson('/api/v1/mobile/parent/children/'.$otherStudent->id)
            ->assertForbidden();
    }

    private function parentWithChild(): array
    {
        $ownStudent = Student::where('status', 'active')->firstOrFail();
        $otherStudent = Student::where('status', 'active')->whereKeyNot($ownStudent->id)->firstOrFail();
        $parent = User::factory()->create([
            'name' => 'Wali Mobile',
            'email' => 'wali.mobile@example.test',
            'password' => 'password',
            'is_active' => true,
        ]);
        $parent->assignRole('orang_tua');
        $parent->children()->syncWithoutDetaching([
            $ownStudent->id => ['relation' => 'wali', 'is_primary' => true],
        ]);

        return [$parent, $ownStudent->fresh('classes'), $otherStudent->fresh('classes')];
    }
}
