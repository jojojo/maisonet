<?php

namespace App\Http\Requests;

use App\Enums\Recurrence;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:120'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'room_id' => ['required', 'integer', 'exists:rooms,id'],
            'member_id' => ['nullable', 'integer', 'exists:members,id'],
            'member_ids' => ['sometimes', 'array'],
            'member_ids.*' => ['required', 'integer', 'distinct', 'exists:members,id'],
            'recurrence' => ['required', Rule::enum(Recurrence::class)],
            'interval' => ['required', 'integer', 'min:1', 'max:365'],
            'next_due_date' => [$this->isMethod('POST') ? 'required' : 'nullable', 'date'],
        ];
    }

    /** @return array<string, mixed> */
    public function taskData(): array
    {
        $data = $this->validated();
        unset($data['member_ids']);

        if ($data['recurrence'] === Recurrence::Once->value) {
            $data['interval'] = 1;
        }

        // An empty date on update keeps the current schedule.
        if (empty($data['next_due_date'])) {
            unset($data['next_due_date']);
        }

        return $data;
    }
}
