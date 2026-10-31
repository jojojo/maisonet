@extends('compatibility.layout')
@section('content')
<section class="card welcome">
    <h1>Bienvenue à la maison !</h1>
    <p>Connectez-vous avec un compte parent pour préparer cet iPad et retrouver les missions du foyer.</p>
    <form method="post" action="{{ route('login') }}">
        @csrf
        <label for="email">Adresse e-mail</label>
        <input id="email" type="email" name="email" autocomplete="username" autocapitalize="none" value="{{ old('email') }}" required>
        <label for="password">Mot de passe</label>
        <input id="password" type="password" name="password" autocomplete="current-password" required>
        <label class="participant"><input type="checkbox" name="remember" value="1"> Rester connecté sur cet iPad</label>
        <button type="submit">Entrer dans Maiso’net</button>
    </form>
    <p class="muted">Cette interface est adaptée aux anciens iPad. La gestion de la famille et des récompenses reste accessible sur un appareil récent.</p>
</section>
@endsection
