@extends('compatibility.layout')
@section('content')
@if(!$parent)
    <section class="card welcome"><h1>Un parent doit préparer cet iPad</h1><p>Le kiosque partagé s’ouvre depuis un compte parent.</p><form method="post" action="{{ route('logout') }}">@csrf<button type="submit">Changer de compte</button></form></section>
@elseif(!$active)
    <section class="card welcome">
        <h1>Un coup de main, chacun son tour !</h1>
        <p>Les missions, de grandes jauges et plusieurs chronomètres à la fois. Les points attendront toujours la validation d’un parent.</p>
        <form method="post" action="{{ route('kiosk.compatibility.enter') }}">@csrf<button type="submit">Activer le kiosque</button></form>
        <p class="muted">Le mot de passe parent sera demandé pour quitter le kiosque. Sur iOS 12, les mini-jeux ne sont pas proposés.</p>
        <form method="post" action="{{ route('logout') }}">@csrf<button class="secondary" type="submit">Se déconnecter</button></form>
    </section>
@else
    <section class="intro"><h1>À nous de jouer !</h1><p>Choisis une mission, indique qui participe, puis lance ton chrono ou coche la mission terminée.</p></section>
    <noscript><p class="notice">Les missions peuvent être déclarées sans JavaScript. Active JavaScript pour utiliser les chronomètres.</p></noscript>
    <div class="toolbar" id="filters" hidden>
        <label for="period">Afficher</label><select id="period"><option value="today">À faire aujourd’hui</option><option value="all">Toutes les missions</option></select>
        <label for="person">Pour</label><select id="person"><option value="">Toute la famille</option>@foreach($members as $member)<option value="{{ $member->id }}">{{ $member->name }}</option>@endforeach</select>
        <a class="button secondary" href="{{ route('kiosk.compatibility.index') }}">Actualiser</a>
    </div>
    <p id="timer-warning" class="notice" hidden>Le stockage est indisponible. Les chronomètres fonctionneront tant que cette page reste ouverte.</p>
    <p id="empty-filter" class="notice" hidden>Tout est au vert pour cette sélection ! Tu peux aussi afficher toutes les missions.</p>
    <div class="missions" id="missions" data-user="{{ auth()->id() }}" data-completed="{{ session('compatible_completed_task') }}">
    @forelse($tasks as $task)
        @php
            $level = $task->dirt_level;
            $pending = $task->completion_info['status'] ?? null;
            $pending = $pending === 'pending';
            $tone = $level >= 85 ? 'red' : ($level >= 60 ? 'orange' : 'green');
        @endphp
        <article class="card mission {{ $tone }}" data-task="{{ $task->id }}" data-completion="{{ $task->completion_info['id'] ?? '' }}" data-today="{{ $task->next_due_date->lte(today()) ? '1' : '0' }}" data-members="{{ $task->members->pluck('id')->implode(',') }}" data-pending="{{ $pending ? '1' : '0' }}">
            <div class="mission-heading"><span class="room-icon" aria-hidden="true">{{ $task->room?->icon }}</span><div><h2>{{ $task->title }}</h2><p class="muted">{{ $task->room?->name }} · {{ $task->next_due_date->lt(today()) ? 'En retard' : ($task->next_due_date->isToday() ? 'Aujourd’hui' : 'Le '.$task->next_due_date->format('d/m')) }}</p></div></div>
            @if($task->notes)<p>{{ $task->notes }}</p>@endif
            @if($level !== null)<div class="gauge" role="meter" aria-label="Jauge de saleté" aria-valuemin="0" aria-valuemax="100" aria-valuenow="{{ $level }}"><span style="width:{{ $level }}%"></span></div><p class="muted">{{ $level }} % de saleté</p>@endif
            @if($pending)
                <p class="notice">Mission réalisée, en attente de validation par un parent.</p>
            @else
                <form method="post" action="{{ route('kiosk.compatibility.complete', $task) }}" class="completion-form">
                    @csrf
                    <fieldset><legend>Qui participe ?</legend>
                    @foreach($members as $member)
                        <label class="participant"><input type="checkbox" name="member_ids[]" value="{{ $member->id }}" @checked($task->members->contains('id', $member->id))> {{ $member->name }}</label>
                    @endforeach
                    </fieldset>
                    <div class="timer" hidden><p class="timer-members"></p><output class="clock" role="timer" aria-label="Temps écoulé">00:00</output><p class="timer-state"></p><button class="secondary pause" type="button">Pause</button><button class="secondary cancel" type="button">Annuler le chrono</button></div>
                    <p class="selection-error" role="alert" tabindex="-1" hidden>Choisis au moins une personne pour cette mission.</p>
                    <div class="actions"><button class="start secondary" type="button" hidden>Je commence !</button><button type="submit">✓ C’est fait !</button></div>
                    <p class="muted">{{ $task->effort_points ?? 0 }} points de base · à valider par un parent</p>
                </form>
            @endif
        </article>
    @empty
        <p class="notice">Aucune mission pour le moment. Un parent peut en ajouter depuis un appareil récent.</p>
    @endforelse
    </div>
    <details class="card parent-exit"><summary>Espace parent · Quitter le kiosque</summary><form method="post" action="{{ route('kiosk.compatibility.leave') }}">@csrf<label for="exit-password">Mot de passe parent</label><input id="exit-password" type="password" name="password" autocomplete="current-password" required><button type="submit" class="secondary">Quitter le kiosque</button></form></details>
@endif
@endsection
@section('scripts')
@if($active)<script src="{{ asset('compatibility/kiosk.js') }}?v=1" defer></script>@endif
@endsection
