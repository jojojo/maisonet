<?php

namespace App\Http\Requests;

use App\Support\FamilyContext;
use Illuminate\Foundation\Http\FormRequest;

class ReviewCompletionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->is_parent;
    }

    public function rules(): array
    {
        return [
            'decision' => ['required', 'in:approve,reject'],
            'awarded_points' => ['nullable', 'integer', 'min:0', 'max:100'],
            'review_note' => ['nullable', 'string', 'max:500'],
            'member_ids' => ['sometimes', 'array', 'max:100'],
            'member_ids.*' => ['required', 'integer', 'distinct', FamilyContext::exists('members')],
        ];
    }
}
