<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ParentGameController extends Controller
{
    public function __invoke(Request $request): Response
    {
        abort_unless($request->user()->is_parent, 403);

        return Inertia::render('parents/games');
    }
}
