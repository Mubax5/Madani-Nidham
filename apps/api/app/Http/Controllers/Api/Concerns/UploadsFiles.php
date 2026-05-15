<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Support\ApiResponse;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

trait UploadsFiles
{
    private array $safeUploadMimes = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'application/pdf' => 'pdf',
        'application/msword' => 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx',
    ];

    private function storePublicFile(UploadedFile $file, string $folder): string
    {
        $mime = (string) $file->getMimeType();
        $extension = $this->safeUploadMimes[$mime] ?? null;

        if (! $file->isValid() || ! $extension || $file->getSize() > 5 * 1024 * 1024) {
            throw new HttpResponseException(
                ApiResponse::error('File tidak bisa diunggah. Gunakan JPG, PNG, WebP, PDF, DOC, atau DOCX maksimal 5MB.', [], 422),
            );
        }

        $safeFolder = trim(preg_replace('/[^A-Za-z0-9_\-\/]/', '', $folder) ?? '', '/');
        $filename = (string) Str::uuid().'.'.$extension;
        $path = Storage::disk('public')->putFileAs($safeFolder, $file, $filename);

        return url('/storage/'.$path);
    }
}
