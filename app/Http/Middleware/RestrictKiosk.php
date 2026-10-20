<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RestrictKiosk
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user() && $request->session()->get('kiosk') && ! $request->routeIs('kiosk.*', 'logout')) {
            if ($request->isMethod('GET')) {
                return redirect()->route('kiosk.index');
            }
            abort(403, 'Quitte le mode kiosque pour accéder à cette action.');
        }

        return $next($request);
    }
}
