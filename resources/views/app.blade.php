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

        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=nunito:400,500,600,700,800" rel="stylesheet" />

        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
        @if(session('full_interface_trial'))
            <aside style="position:fixed;right:8px;bottom:8px;z-index:1000;padding:6px 10px;border:1px solid #225466;border-radius:10px;background:white;color:#225466;font:12px sans-serif">
                Essai iPad · <a href="{{ route(auth()->check() ? 'kiosk.compatibility.index' : 'compatibility.login') }}" style="color:#225466;text-decoration:underline">Version de secours</a>
            </aside>
        @endif
    </body>
</html>
