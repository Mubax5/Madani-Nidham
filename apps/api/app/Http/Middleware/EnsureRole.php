<?php

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;

class EnsureRole
{
    public function handle(Request $request, Closure $next, string $roles)
    {
        $allowed = explode('|', $roles);
        $user = $request->user();

        if (! $user || ! $user->hasAnyRole($allowed)) {
            return ApiResponse::error('Anda tidak memiliki akses untuk aksi ini.', [], 403);
        }

        return $next($request);
    }
}
