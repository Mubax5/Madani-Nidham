<?php

namespace App\Services;

use App\Models\AiChatUsage;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\DB;

class AiQuotaService
{
    private const ROLE_WEIGHTS = [
        'super_admin' => 2,
        'kepala_sekolah' => 2,
        'admin' => 2,
        'orang_tua' => 1,
    ];

    public function assertCanSend(User $user, int $estimatedTokens): array
    {
        $quota = $this->quotaFor($user);
        $usage = $this->usageFor($user);

        if ($quota['daily_request_limit'] < 1) {
            throw new HttpResponseException(ApiResponse::error('Akses AI hanya untuk super admin, kepala sekolah, admin, dan orang tua.', [], 403));
        }

        if ($usage['requests_today'] >= $quota['daily_request_limit']) {
            throw new HttpResponseException(ApiResponse::error('Kuota AI harian akun ini habis.', [
                'daily_request_limit' => $quota['daily_request_limit'],
                'requests_today' => $usage['requests_today'],
                'remaining_requests' => 0,
                'reset_at' => now()->endOfDay()->toIso8601String(),
            ], 429));
        }

        if (($usage['tokens_this_minute'] + $estimatedTokens) > $quota['tokens_per_minute_limit']) {
            throw new HttpResponseException(ApiResponse::error('Limit token AI per menit akun ini tercapai.', [
                'tokens_per_minute_limit' => $quota['tokens_per_minute_limit'],
                'tokens_this_minute' => $usage['tokens_this_minute'],
                'estimated_tokens' => $estimatedTokens,
                'reset_at' => now()->startOfMinute()->addMinute()->toIso8601String(),
            ], 429));
        }

        return [
            ...$quota,
            ...$usage,
            'remaining_requests' => max($quota['daily_request_limit'] - $usage['requests_today'], 0),
            'remaining_tokens_this_minute' => max($quota['tokens_per_minute_limit'] - $usage['tokens_this_minute'], 0),
        ];
    }

    public function record(User $user, int $tokensUsed): void
    {
        $usageDate = now()->toDateString();
        $minuteBucket = now()->startOfMinute();

        DB::transaction(function () use ($user, $usageDate, $minuteBucket, $tokensUsed) {
            $usage = AiChatUsage::where('user_id', $user->id)
                ->whereDate('usage_date', $usageDate)
                ->where('minute_bucket', $minuteBucket)
                ->lockForUpdate()
                ->first();

            if (! $usage) {
                AiChatUsage::create([
                    'user_id' => $user->id,
                    'usage_date' => $usageDate,
                    'minute_bucket' => $minuteBucket,
                    'requests_used' => 1,
                    'tokens_used' => $tokensUsed,
                ]);

                return;
            }

            $usage->increment('requests_used');
            $usage->increment('tokens_used', $tokensUsed);
        });
    }

    public function quotaFor(User $user): array
    {
        $activeUsers = User::query()
            ->where('is_active', true)
            ->permission('use_ai_chat')
            ->with('roles')
            ->get()
            ->filter(fn (User $item) => $this->allowedRoleFor($item) !== null);

        if ($activeUsers->isEmpty()) {
            $activeUsers = collect([$user->loadMissing('roles')]);
        }

        $role = $this->allowedRoleFor($user->loadMissing('roles'));
        $totalWeight = max(1, $activeUsers->sum(fn (User $item) => self::ROLE_WEIGHTS[$this->allowedRoleFor($item)] ?? 0));
        $globalDailyRequests = $this->globalDailyRequests();
        $globalTokensPerMinute = $this->globalTokensPerMinute();
        $roleWeight = self::ROLE_WEIGHTS[$role] ?? 0;
        $baseDailyLimit = max(1, intdiv($globalDailyRequests, $totalWeight));
        $dailyLimit = match ($role) {
            'orang_tua', 'super_admin', 'kepala_sekolah', 'admin' => $baseDailyLimit * $roleWeight,
            default => 0,
        };
        $tokenLimit = $dailyLimit > 0
            ? max(1000, (int) floor($globalTokensPerMinute * ($dailyLimit / max($globalDailyRequests, 1))))
            : 0;

        return [
            'daily_request_limit' => $dailyLimit,
            'tokens_per_minute_limit' => $tokenLimit,
            'global_daily_requests' => $globalDailyRequests,
            'global_tokens_per_minute' => $globalTokensPerMinute,
            'weight' => $roleWeight,
            'role' => $role,
            'active_ai_users' => $activeUsers->count(),
            'parent_user_count' => $activeUsers->filter(fn (User $item) => $this->allowedRoleFor($item) === 'orang_tua')->count(),
            'parent_daily_request_limit' => $baseDailyLimit,
            'total_weight' => $totalWeight,
            'distribution_note' => 'Kuota dibagi berbobot: orang tua 1x, super admin/admin/kepala sekolah 2x.',
        ];
    }

    public function usageFor(User $user): array
    {
        $today = now()->toDateString();
        $minuteBucket = now()->startOfMinute();

        return [
            'requests_today' => (int) AiChatUsage::where('user_id', $user->id)
                ->whereDate('usage_date', $today)
                ->sum('requests_used'),
            'tokens_today' => (int) AiChatUsage::where('user_id', $user->id)
                ->whereDate('usage_date', $today)
                ->sum('tokens_used'),
            'tokens_this_minute' => (int) AiChatUsage::where('user_id', $user->id)
                ->where('minute_bucket', $minuteBucket)
                ->sum('tokens_used'),
        ];
    }

    public function estimateTokens(string $text): int
    {
        return max(1, (int) ceil(mb_strlen($text) / 4));
    }

    private function allowedRoleFor(User $user): ?string
    {
        $roles = $user->roles->pluck('name');

        foreach (['kepala_sekolah', 'super_admin', 'admin', 'orang_tua'] as $role) {
            if ($roles->contains($role)) {
                return $role;
            }
        }

        return null;
    }

    private function globalDailyRequests(): int
    {
        return max(1, (int) config('services.ai_quota.global_daily_requests', 1500));
    }

    private function globalTokensPerMinute(): int
    {
        return max(1000, (int) config('services.ai_quota.global_tokens_per_minute', 800000));
    }
}
