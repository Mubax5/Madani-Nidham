<?php

namespace App\Support;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class ApiResponse
{
    public static function success(mixed $data = null, string $message = 'Data berhasil diproses', array $meta = [], int $status = 200): JsonResponse
    {
        $payload = [
            'success' => true,
            'message' => $message,
            'data' => self::camelize($data),
        ];

        if ($meta !== []) {
            $payload['meta'] = self::camelize($meta);
        }

        return response()->json($payload, $status);
    }

    public static function error(string $message, array $errors = [], int $status = 422): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $message,
            'errors' => self::camelize($errors),
        ], $status);
    }

    public static function fromPaginator(LengthAwarePaginator $paginator, string $message = 'Data berhasil diambil'): JsonResponse
    {
        return self::success($paginator->items(), $message, [
            'current_page' => $paginator->currentPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'last_page' => $paginator->lastPage(),
        ]);
    }

    public static function camelize(mixed $value): mixed
    {
        if ($value instanceof \JsonSerializable) {
            $value = $value->jsonSerialize();
        }

        if ($value instanceof \Illuminate\Contracts\Support\Arrayable) {
            $value = $value->toArray();
        }

        if (! is_array($value)) {
            return $value;
        }

        $result = [];

        foreach ($value as $key => $item) {
            $result[is_string($key) ? Str::camel($key) : $key] = self::camelize($item);
        }

        return $result;
    }
}
