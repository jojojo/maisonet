<?php

namespace App\Actions\Kiosk;

use Illuminate\Contracts\Session\Session;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Lorisleiva\Actions\Concerns\AsAction;

class EnterKiosk
{
    use AsAction;

    public function handle(Session $session): void
    {
        $session->put('kiosk', true);
        $session->regenerate();
    }

    public function asController(Request $request): RedirectResponse
    {
        abort_unless($request->user()->is_parent, 403);
        $this->handle($request->session());

        return redirect()->route($request->routeIs('kiosk.compatibility.*') ? 'kiosk.compatibility.index' : 'kiosk.index');
    }
}
