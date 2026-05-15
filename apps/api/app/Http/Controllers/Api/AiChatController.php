<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiChatHistory;
use App\Models\AiChatUsage;
use App\Models\AiManagerChatHistory;
use App\Models\Student;
use App\Models\User;
use App\Services\AiQuotaService;
use App\Services\GeminiService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;

class AiChatController extends Controller
{
    public function chat(Request $request, GeminiService $gemini, AiQuotaService $quota)
    {
        $data = $request->validate([
            'studentId' => ['nullable', 'exists:students,id'],
            'message' => ['required', 'string', 'max:2000'],
        ]);
        $user = $request->user();
        $this->purgeOldHistories($user);

        if ($user->hasRole('orang_tua')) {
            abort_unless(! empty($data['studentId']), 422, 'Data anak belum tersedia untuk room AI.');
            abort_unless($user->children()->where('students.id', $data['studentId'])->exists(), 403);

            $student = Student::findOrFail($data['studentId']);
            $result = $gemini->chatChild($user, $student, $data['message']);

            return ApiResponse::success([
                'reply' => $result['reply'],
                'room' => 'student',
                'source' => $result['source'] ?? null,
                'source_label' => $result['source_label'] ?? null,
                'quota' => $this->quotaPayload($user, $quota),
            ], 'Respons AI berhasil dibuat.');
        }

        abort_unless($this->canUseManagerRoom($user), 403);
        abort_if(! empty($data['studentId']), 422, 'Room manajerial tidak bisa mengirim chat sebagai orang tua murid.');
        $result = $gemini->chatManager($user, $data['message']);

        return ApiResponse::success([
            'reply' => $result['reply'],
            'room' => 'manager',
            'source' => $result['source'] ?? null,
            'source_label' => $result['source_label'] ?? null,
            'quota' => $this->quotaPayload($user, $quota),
        ], 'Respons AI berhasil dibuat.');
    }

    public function myHistory(Request $request, AiQuotaService $quota)
    {
        $user = $request->user();
        $this->purgeOldHistories($user);
        $today = now()->toDateString();

        if ($user->hasRole('orang_tua')) {
            $studentId = $request->integer('studentId') ?: $user->children()->value('students.id');
            if (! $studentId) {
                return ApiResponse::success(['room' => 'student', 'student' => null, 'messages' => [], 'quota' => $this->quotaPayload($user, $quota)], 'Riwayat chat berhasil diambil.');
            }

            abort_unless($user->children()->where('students.id', $studentId)->exists(), 403);
            $student = Student::with('classes')->findOrFail($studentId);

            return ApiResponse::success([
                'room' => 'student',
                'student' => $student,
                'messages' => AiChatHistory::where('user_id', $user->id)->where('student_id', $studentId)->whereDate('created_at', $today)->oldest()->get(),
                'quota' => $this->quotaPayload($user, $quota),
            ], 'Riwayat chat berhasil diambil.');
        }

        abort_unless($this->canUseManagerRoom($user), 403);

        return ApiResponse::success([
            'room' => 'manager',
            'student' => null,
            'messages' => AiManagerChatHistory::where('user_id', $user->id)->whereDate('created_at', $today)->oldest()->get(),
            'quota' => $this->quotaPayload($user, $quota),
        ], 'Riwayat chat berhasil diambil.');
    }

    public function clearMine(Request $request)
    {
        $user = $request->user();

        if ($user->hasRole('orang_tua')) {
            $studentId = $request->integer('studentId') ?: $user->children()->value('students.id');
            if ($studentId) {
                abort_unless($user->children()->where('students.id', $studentId)->exists(), 403);
                AiChatHistory::where('user_id', $user->id)->where('student_id', $studentId)->delete();
            }

            return ApiResponse::success(null, 'Riwayat chat berhasil dihapus.');
        }

        abort_unless($this->canUseManagerRoom($user), 403);
        AiManagerChatHistory::where('user_id', $user->id)->delete();

        return ApiResponse::success(null, 'Riwayat chat berhasil dihapus.');
    }

    public function history(Request $request, Student $student)
    {
        $this->purgeOldHistories($request->user());
        if ($request->user()->hasRole('orang_tua')) {
            abort_unless($request->user()->children()->where('students.id', $student->id)->exists(), 403);
        }

        return ApiResponse::success(
            AiChatHistory::where('user_id', $request->user()->id)->where('student_id', $student->id)->whereDate('created_at', now()->toDateString())->oldest()->get(),
            'Riwayat chat berhasil diambil.',
        );
    }

    public function clear(Request $request, Student $student)
    {
        AiChatHistory::where('user_id', $request->user()->id)->where('student_id', $student->id)->delete();

        return ApiResponse::success(null, 'Riwayat chat berhasil dihapus.');
    }

    public function histories(Request $request)
    {
        $this->purgeOldHistories();
        $query = AiChatHistory::with(['user:id,name,email', 'student:id,full_name,nickname'])
            ->whereHas('user.roles', fn ($roleQuery) => $roleQuery->where('name', 'orang_tua'))
            ->latest('id');

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->integer('user_id'));
        }

        if ($request->filled('student_id')) {
            $query->where('student_id', $request->integer('student_id'));
        }

        if ($request->filled('date')) {
            $query->whereDate('created_at', $request->date('date')->toDateString());
        }

        return ApiResponse::fromPaginator($query->paginate(min(max((int) $request->integer('perPage', 25), 1), 100)), 'Riwayat AI berhasil diambil.');
    }

    public function usage(Request $request, AiQuotaService $quota)
    {
        $this->purgeOldHistories();
        $today = $request->date('date')?->toDateString() ?? now()->toDateString();
        $currentQuota = $quota->quotaFor($request->user());
        $users = User::query()
            ->where('is_active', true)
            ->permission('use_ai_chat')
            ->with('roles')
            ->orderBy('name')
            ->get()
            ->filter(fn (User $user) => $quota->quotaFor($user)['daily_request_limit'] > 0)
            ->map(function (User $user) use ($quota, $today) {
                $quotaData = $quota->quotaFor($user);
                $requests = (int) AiChatUsage::where('user_id', $user->id)
                    ->whereDate('usage_date', $today)
                    ->sum('requests_used');
                $tokens = (int) AiChatUsage::where('user_id', $user->id)
                    ->whereDate('usage_date', $today)
                    ->sum('tokens_used');

                return [
                    'user' => $user,
                    'quota' => $quotaData,
                    'requests_today' => $requests,
                    'tokens_today' => $tokens,
                    'remaining_requests' => max($quotaData['daily_request_limit'] - $requests, 0),
                ];
            });

        return ApiResponse::success([
            'date' => $today,
            'global' => [
                'daily_requests' => $currentQuota['global_daily_requests'],
                'tokens_per_minute' => $currentQuota['global_tokens_per_minute'],
            ],
            'users' => $users,
            'totals' => [
                'requests' => $users->sum('requests_today'),
                'tokens' => $users->sum('tokens_today'),
                'active_ai_users' => $users->count(),
            ],
        ], 'Usage AI berhasil diambil.');
    }

    public function destroy(AiChatHistory $history)
    {
        $history->delete();

        return ApiResponse::success(null, 'Riwayat AI berhasil dihapus.');
    }

    private function canUseManagerRoom(User $user): bool
    {
        return $user->hasAnyRole(['super_admin', 'kepala_sekolah', 'admin']);
    }

    private function quotaPayload(User $user, AiQuotaService $quota): array
    {
        $quotaData = $quota->quotaFor($user);
        $usage = $quota->usageFor($user);

        return [
            'daily_request_limit' => $quotaData['daily_request_limit'],
            'remaining_requests' => max($quotaData['daily_request_limit'] - $usage['requests_today'], 0),
            'tokens_per_minute_limit' => $quotaData['tokens_per_minute_limit'],
            'requests_today' => $usage['requests_today'],
        ];
    }

    private function purgeOldHistories(?User $user = null): void
    {
        $today = now()->toDateString();

        AiChatHistory::query()
            ->when($user, fn ($query) => $query->where('user_id', $user->id))
            ->whereDate('created_at', '<', $today)
            ->delete();

        AiManagerChatHistory::query()
            ->when($user, fn ($query) => $query->where('user_id', $user->id))
            ->whereDate('created_at', '<', $today)
            ->delete();
    }
}
