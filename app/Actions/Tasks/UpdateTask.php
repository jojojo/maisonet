<?php

namespace App\Actions\Tasks;

use App\Http\Requests\TaskRequest;
use App\Models\Task;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Lorisleiva\Actions\Concerns\AsAction;

class UpdateTask
{
    use AsAction;

    public function handle(Task $task, array $data, array $assignment = []): Task
    {
        return DB::transaction(function () use ($task, $data, $assignment) {
            $task->update($data);
            AssignTaskMembers::run($task, $assignment);

            return $task;
        });
    }

    public function asController(TaskRequest $request, Task $task): RedirectResponse
    {
        $this->handle($task, $request->taskData(), $request->validated());

        return back();
    }
}
