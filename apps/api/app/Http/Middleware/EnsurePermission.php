<?php

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;

class EnsurePermission
{
    public function handle(Request $request, Closure $next, string $permissions)
    {
        $user = $request->user();
        $allowed = explode('|', $permissions);

        if (! $user || ! $user->hasAnyPermission($allowed)) {
            return ApiResponse::error('Anda tidak memiliki akses untuk aksi ini.', [], 403);
        }

        return $next($request);
    }
}
