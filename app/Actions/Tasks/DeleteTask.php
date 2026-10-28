<?php

namespace App\Actions\Tasks;

use App\Models\Task;
use Illuminate\Http\RedirectResponse;
use Lorisleiva\Actions\Concerns\AsAction;

class DeleteTask
{
    use AsAction;

    public function handle(Task $task): void
    {
        $task->delete();
    }

    public function asController(Task $task): RedirectResponse
    {
        $this->handle($task);

        return back();
    }
}
