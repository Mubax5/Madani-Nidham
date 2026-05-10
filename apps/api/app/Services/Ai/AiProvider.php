<?php

namespace App\Services\Ai;

interface AiProvider
{
    public function name(): string;

    public function label(): string;

    public function isConfigured(): bool;

    /**
     * @param array<int, array{role: string, content: string}> $messages
     */
    public function generate(string $systemPrompt, array $messages, array $options = []): ?AiProviderResult;
}
