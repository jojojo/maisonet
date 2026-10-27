<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SkipTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->is_parent;
    }

    public function rules(): array
    {
        return [
            'due_on' => ['required', 'date_format:Y-m-d'],
            'reason' => ['nullable', 'string', 'max:500'],
            'password' => $this->hasSession() && $this->session()->get('kiosk') ? ['required', 'current_password'] : ['nullable'],
        ];
    }
}
