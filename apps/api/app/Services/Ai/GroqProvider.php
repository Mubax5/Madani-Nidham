<?php

namespace App\Services\Ai;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class GroqProvider implements AiProvider
{
    public function name(): string
    {
        return 'groq';
    }

    public function label(): string
    {
        return 'Dibantu Groq';
    }

    public function isConfigured(): bool
    {
        return (string) config('services.groq.api_key') !== '';
    }

    public function generate(string $systemPrompt, array $messages, array $options = []): ?AiProviderResult
    {
        if (! $this->isConfigured()) {
            return null;
        }

        $baseUrl = rtrim((string) config('services.groq.base_url', 'https://api.groq.com/openai/v1'), '/');
        $payloadMessages = array_merge(
            [['role' => 'system', 'content' => $systemPrompt]],
            collect($messages)
                ->map(fn (array $message) => [
                    'role' => $message['role'] === 'assistant' ? 'assistant' : 'user',
                    'content' => $message['content'],
                ])
                ->values()
                ->all(),
        );

        $response = Http::connectTimeout((float) ($options['connect_timeout'] ?? 1.0))
            ->timeout((float) ($options['timeout'] ?? 2.0))
            ->withToken((string) config('services.groq.api_key'))
            ->post($baseUrl.'/chat/completions', [
                'model' => (string) config('services.groq.model', 'llama-3.1-8b-instant'),
                'messages' => $payloadMessages,
                'temperature' => (float) ($options['temperature'] ?? 0.25),
                'max_tokens' => (int) ($options['max_tokens'] ?? 700),
            ]);

        if ($response->failed()) {
            throw new RuntimeException('Groq failed: '.$response->status().' '.$response->json('error.message'));
        }

        $text = trim((string) ($response->json('choices.0.message.content') ?? ''));
        if ($text === '') {
            throw new RuntimeException('Groq returned empty response.');
        }

        return new AiProviderResult(
            $text,
            (int) ($response->json('usage.total_tokens') ?? 0),
        );
    }
}
