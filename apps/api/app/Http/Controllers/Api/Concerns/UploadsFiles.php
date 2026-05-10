<?php

namespace App\Http\Controllers\Api\Concerns;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

trait UploadsFiles
{
    private function storePublicFile(UploadedFile $file, string $folder): string
    {
        $path = Storage::disk('public')->putFile($folder, $file);

        return url('/storage/'.$path);
    }
}
