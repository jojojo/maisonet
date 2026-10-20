<?php

namespace App\Http\Requests;

use App\Models\Task;
use App\Support\FamilyContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\ValidationException;

class CompleteTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'member_id' => ['nullable', 'integer', FamilyContext::exists('members')],
            'member_ids' => ['sometimes', 'array', 'max:100'],
            'member_ids.*' => ['required', 'integer', 'distinct', FamilyContext::exists('members')],
        ];
    }

    public function participantIds(Task $task): array
    {
        $data = $this->validated();
        $actor = $this->user();
        $ids = $data['member_ids'] ?? (isset($data['member_id']) ? [$data['member_id']] : ($actor->is_parent ? $task->members()->pluck('members.id')->all() : array_filter([$actor->member_id])));
        if (! $actor->is_parent && (! $actor->member_id || ! in_array($actor->member_id, $ids))) {
            throw ValidationException::withMessages(['member_ids' => 'Un parent doit relier ton compte à un membre du foyer. Tu dois participer à la mission déclarée.']);
        }

        return array_values($ids);
    }
}
