<?php

namespace App\Actions\Kiosk;

use Illuminate\Contracts\Session\Session;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Lorisleiva\Actions\Concerns\AsAction;

class LeaveKiosk
{
    use AsAction;

    public function handle(Session $session): void
    {
        $session->forget('kiosk');
        $session->regenerate();
    }

    public function asController(Request $request): RedirectResponse
    {
        $request->validate(['password' => ['required', 'current_password']]);
        $this->handle($request->session());

        return redirect()->route($request->routeIs('kiosk.compatibility.*') ? 'kiosk.compatibility.index' : 'dashboard');
    }
}
