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
    <section class="card" aria-label="Choix de l’interface">
        <strong>Vous utilisez la version compatible.</strong>
        <p>Retrouvez l’interface complète, les montagnes et les mini-jeux.</p>
        <a class="button" href="{{ route('kiosk.compatibility.trial') }}">Passer à l’interface complète</a>
        @if(session('kiosk'))
            <p class="muted">Le kiosque restera verrouillé. Pour accéder à l’espace parent, quittez ensuite le kiosque avec votre mot de passe.</p>
        @endif
    </section>
    @if(session('success'))<p class="notice" role="status">{{ session('success') }}</p>@endif
    @if($errors->any())
        <div class="notice error" role="alert"><strong>Un petit détail à vérifier</strong><ul>@foreach($errors->all() as $error)<li>{{ $error }}</li>@endforeach</ul></div>
    @endif
    @yield('content')
</main>
@yield('scripts')
</body>
</html>
