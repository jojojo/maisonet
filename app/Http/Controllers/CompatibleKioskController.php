<?php

namespace App\Http\Controllers;

use App\Models\Member;
use App\Models\Task;
use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;

class CompatibleKioskController extends Controller
{
    public function login(Request $request): View
    {
        $request->session()->put('url.intended', route('kiosk.compatibility.index'));

        return view('compatibility.login');
    }

    public function index(Request $request): View
    {
        $parent = (bool) $request->user()->is_parent;
        $active = $parent && (bool) $request->session()->get('kiosk');

        return view('compatibility.kiosk', [
            'parent' => $parent,
            'active' => $active,
            'members' => $active ? Member::orderBy('name')->get() : collect(),
            'tasks' => $active ? Task::with(['room', 'members'])->whereNotNull('next_due_date')
                ->get()->sortByDesc(fn (Task $task) => $task->dirt_level ?? ($task->next_due_date->lte(today()) ? 100 : 0))->values() : collect(),
        ]);
    }
}
