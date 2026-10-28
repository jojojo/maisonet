<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\CompletionResource;
use App\Models\TaskCompletion;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class CompletionController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize('manage-goals');
        $data = $request->validate(['per_page' => ['sometimes', 'integer', 'min:1', 'max:100']]);

        return CompletionResource::collection(TaskCompletion::where('status', 'pending')
            ->with(['participants', 'task.room', 'task.members'])->oldest('completed_on')->oldest('id')
            ->paginate($data['per_page'] ?? 30)->withQueryString());
    }
}
