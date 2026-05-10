<?php

namespace App\Services\Ai;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class GeminiProvider implements AiProvider
{
    public function name(): string
    {
        return 'gemini';
    }

    public function label(): string
    {
        return 'Dibantu Gemini';
    }

    public function isConfigured(): bool
    {
        return (string) config('services.gemini.api_key') !== '';
    }

    public function generate(string $systemPrompt, array $messages, array $options = []): ?AiProviderResult
    {
        if (! $this->isConfigured()) {
            return null;
        }

        $model = (string) config('services.gemini.model', 'gemini-2.0-flash');
        $endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/'.$model.':generateContent';
        $contents = collect($messages)
            ->map(fn (array $message) => [
                'role' => $message['role'] === 'assistant' ? 'model' : 'user',
                'parts' => [['text' => $message['content']]],
            ])
            ->values()
            ->all();

        $response = Http::connectTimeout((float) ($options['connect_timeout'] ?? 1.0))
            ->timeout((float) ($options['timeout'] ?? 2.2))
            ->withHeaders(['X-goog-api-key' => (string) config('services.gemini.api_key')])
            ->post($endpoint, [
                'system_instruction' => ['parts' => [['text' => $systemPrompt]]],
                'contents' => $contents,
                'generationConfig' => [
                    'temperature' => (float) ($options['temperature'] ?? 0.25),
                    'topP' => 0.9,
                    'maxOutputTokens' => (int) ($options['max_tokens'] ?? 700),
                ],
            ]);

        if ($response->failed()) {
            throw new RuntimeException('Gemini failed: '.$response->status().' '.$response->json('error.message'));
        }

        $text = trim((string) ($response->json('candidates.0.content.parts.0.text') ?? ''));
        if ($text === '') {
            throw new RuntimeException('Gemini returned empty response.');
        }

        return new AiProviderResult(
            $text,
            (int) ($response->json('usageMetadata.totalTokenCount') ?? 0),
        );
    }
}
