<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#43bfc4">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-title" content="Maiso’net">
    <meta name="robots" content="noindex">
    <title>Maiso’net · Kiosque compatible</title>
    <link rel="apple-touch-icon" href="/pwa-icons/apple-touch-icon.png">
    <link rel="icon" href="/pwa-icons/icon-192.png">
    <link rel="stylesheet" href="{{ asset('compatibility/kiosk.css') }}?v=1">
</head>
<body>
<main class="page">
    <header class="masthead">
        <img src="/pwa-icons/icon-192.png" width="64" height="64" alt="">
        <div><strong>Maiso’net</strong><p>Les petites missions de la famille</p></div>
        <span class="badge">Kiosque compatible</span>
    </header>
    @if(session('success'))<p class="notice" role="status">{{ session('success') }}</p>@endif
    @if($errors->any())
        <div class="notice error" role="alert"><strong>Un petit détail à vérifier</strong><ul>@foreach($errors->all() as $error)<li>{{ $error }}</li>@endforeach</ul></div>
    @endif
    @yield('content')
</main>
@yield('scripts')
</body>
</html>
