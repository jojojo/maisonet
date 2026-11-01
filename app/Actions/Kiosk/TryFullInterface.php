<?php

namespace App\Actions\Kiosk;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Lorisleiva\Actions\Concerns\AsAction;

class TryFullInterface
{
    use AsAction;

    public function asController(Request $request): RedirectResponse
    {
        $request->session()->put('full_interface_trial', true);
        if (! $request->user()) {
            $request->session()->put('url.intended', route('dashboard'));
        }

        return redirect()->route($request->session()->get('kiosk') ? 'kiosk.index' : ($request->user() ? 'dashboard' : 'login'));
    }
}
