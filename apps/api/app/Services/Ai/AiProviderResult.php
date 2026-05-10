<?php

namespace App\Services\Ai;

class AiProviderResult
{
    public function __construct(
        public string $text,
        public int $tokensUsed = 0,
    ) {}
}
