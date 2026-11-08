<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="theme-color" content="#059669">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-status-bar-style" content="default">
        <meta name="apple-mobile-web-app-title" content="Maiso'net">
        <link rel="manifest" href="/manifest.webmanifest">
        <link rel="icon" type="image/png" sizes="192x192" href="/pwa-icons/icon-192.png">
        <link rel="apple-touch-icon" sizes="180x180" href="/pwa-icons/apple-touch-icon.png">

        <title inertia>{{ config('app.name', 'Laravel') }}</title>
        @if(session('full_interface_trial'))
            <script>
                (function () {
                    var reported = false;
                    window.maisonetShowError = function (error, kind) {
                        if (location.pathname.indexOf('/kiosk') !== 0 || reported) return;
                        reported = true;
                        var message = String(error && error.message || error || 'Erreur de chargement du kiosque').slice(0, 1000);
                        var stack = String(error && error.stack || '').slice(0, 2000);
                        function show() {
                            var panel = document.createElement('section');
                            panel.setAttribute('role', 'alert');
                            panel.style.cssText = 'margin:24px;padding:24px;background:white;color:#224b59;border:2px solid #43bfc4;border-radius:16px;font:17px sans-serif;position:relative;z-index:1900';
                            var title = document.createElement('h1');
                            title.textContent = 'Le kiosque rencontre un problème sur cet appareil.';
                            var detail = document.createElement('pre');
                            detail.style.cssText = 'white-space:pre-wrap;word-wrap:break-word;font:14px monospace';
                            detail.textContent = message;
                            var help = document.createElement('p');
                            help.textContent = 'Le diagnostic a été enregistré pour corriger ce problème. La version de secours reste disponible en bas de page.';
                            panel.appendChild(title); panel.appendChild(detail); panel.appendChild(help);
                            document.body.appendChild(panel);
                        }
                        if (document.body) show(); else document.addEventListener('DOMContentLoaded', show);
                        try {
                            var headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
                            var xsrf = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
                            if (xsrf) headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrf[1]);
                            else headers['X-CSRF-TOKEN'] = @json(csrf_token());
                            fetch(@json(route('kiosk.diagnostics')), {
                                method: 'POST', credentials: 'same-origin',
                                headers: headers,
                                body: JSON.stringify({ message: message, stack: stack, kind: kind || 'runtime' })
                            }).catch(function () {});
                        } catch (ignored) {}
                    };
                    window.addEventListener('error', function (event) { window.maisonetShowError(event.error || event.message || 'Module indisponible', 'runtime'); });
                    window.addEventListener('unhandledrejection', function (event) { window.maisonetShowError(event.reason, 'promise'); });
                })();
            </script>
        @endif


        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body>
        @inertia
        @if(session('full_interface_trial'))
            <aside style="position:fixed;right:8px;bottom:8px;z-index:2000;padding:6px 10px;border-radius:12px;background:#fff;color:#224b59;border:1px solid #8dbfc1;font:13px sans-serif">
                Essai Bootstrap · <a href="{{ route(auth()->check() ? 'kiosk.compatibility.index' : 'compatibility.login') }}">Version de secours</a>
            </aside>
        @endif
    </body>
</html>
