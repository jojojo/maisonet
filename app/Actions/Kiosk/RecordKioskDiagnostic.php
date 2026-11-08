<?php

namespace App\Actions\Kiosk;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\File;
use Lorisleiva\Actions\Concerns\AsAction;

class RecordKioskDiagnostic
{
    use AsAction;

    public function asController(Request $request): Response
    {
        $data = $request->validate([
            'message' => ['required', 'string', 'max:1000'],
            'stack' => ['nullable', 'string', 'max:2000'],
            'kind' => ['required', 'in:runtime,module,render,promise'],
        ]);
        File::append(storage_path('app/kiosk-diagnostics.jsonl'), json_encode([
            'at' => now()->toIso8601String(),
            'user_id' => $request->user()->id,
            'family_id' => $request->user()->family_id,
            'user_agent' => substr($request->userAgent() ?? '', 0, 250),
            ...$data,
        ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE).PHP_EOL, true);

        return response()->noContent();
    }
}
