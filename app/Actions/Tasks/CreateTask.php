<?php

namespace App\Actions\Tasks;

use App\Http\Requests\TaskRequest;
use App\Models\Task;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Lorisleiva\Actions\Concerns\AsAction;

class CreateTask
{
    use AsAction;

    public function handle(array $data, array $assignment = []): Task
    {
        return DB::transaction(function () use ($data, $assignment) {
            $task = Task::create($data);
            AssignTaskMembers::run($task, $assignment);

            return $task;
        });
    }

    public function asController(TaskRequest $request): RedirectResponse
    {
        $this->handle($request->taskData(), $request->validated());

        return back();
    }
}
