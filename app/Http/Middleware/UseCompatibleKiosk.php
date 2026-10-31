<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class UseCompatibleKiosk
{
    public function handle(Request $request, Closure $next): Response
    {
        // On older iOS, all browsers use the system WebKit engine.
        $oldIos = preg_match('/(?:CPU (?:iPhone )?OS|iPhone OS) (\d+)[_\.](\d+)/i', $request->userAgent() ?? '', $matches)
            && ((int) $matches[1] < 16 || ((int) $matches[1] === 16 && (int) $matches[2] < 4));

        if ($oldIos && $request->isMethod('GET')) {
            if ($request->routeIs('login')) {
                return redirect()->route('compatibility.login');
            }

            if ($request->routeIs('home', 'dashboard', 'kiosk.index', 'mobile', 'planning', 'rooms.*', 'tasks.index', 'members.index', 'family.index', 'goals.index', 'rewards.index', 'task-templates.index', 'parents.games')) {
                return redirect()->route('kiosk.compatibility.index');
            }
        }

        return $next($request);
    }
}
