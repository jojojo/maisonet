/* iOS 12 kiosk: plain ES5, no framework, modules or polyfill download. */
(function () {
    'use strict';
    var board = document.getElementById('missions');
    if (!board) return;
    var cards = Array.prototype.slice.call(board.querySelectorAll('[data-task]'));
    var storageKey = 'maisonet:compatible-timers:' + board.getAttribute('data-user');
    var warning = document.getElementById('timer-warning');
    var period = document.getElementById('period');
    var person = document.getElementById('person');
    var timers = {};

    function restore(raw) {
        var result = {};
        try {
            var stored = JSON.parse(raw || '{}');
            cards.forEach(function (card) {
                var id = card.getAttribute('data-task');
                var value = stored && stored[id];
                if (!value || card.getAttribute('data-pending') === '1' || id === board.getAttribute('data-completed')) return;
                if (value.completion !== card.getAttribute('data-completion')) return;
                if (typeof value.elapsed !== 'number' || !isFinite(value.elapsed) || value.elapsed < 0) return;
                if (value.started !== null && (typeof value.started !== 'number' || !isFinite(value.started) || value.started < 0)) return;
                if (!Array.isArray(value.members)) return;
                result[id] = { elapsed: value.elapsed, started: value.started, members: value.members, completion: value.completion };
            });
        } catch (ignore) { /* Malformed browser data must not block the board. */ }
        return result;
    }

    function save() {
        try { window.localStorage.setItem(storageKey, JSON.stringify(timers)); }
        catch (ignore) { warning.hidden = false; }
    }

    function selected(card) {
        return Array.prototype.map.call(card.querySelectorAll('input[name="member_ids[]"]:checked'), function (input) { return input.value; });
    }

    function elapsed(timer) {
        return timer.elapsed + (timer.started === null ? 0 : Math.max(0, Date.now() - timer.started));
    }

    function clock(milliseconds) {
        var seconds = Math.floor(milliseconds / 1000);
        var hours = Math.floor(seconds / 3600);
        function pad(value) { return value < 10 ? '0' + value : String(value); }
        return (hours ? pad(hours) + ':' : '') + pad(Math.floor(seconds / 60) % 60) + ':' + pad(seconds % 60);
    }

    function paint(card) {
        var id = card.getAttribute('data-task');
        var timer = timers[id];
        var panel = card.querySelector('.timer');
        if (!panel) return;
        panel.hidden = !timer;
        card.querySelector('.start').hidden = !!timer;
        if (timer) {
            panel.querySelector('.clock').textContent = clock(elapsed(timer));
            panel.querySelector('.timer-state').textContent = timer.started === null ? 'En pause' : 'Mission en cours !';
            panel.querySelector('.pause').textContent = timer.started === null ? 'Reprendre' : 'Pause';
            var names = [];
            Array.prototype.forEach.call(card.querySelectorAll('input[name="member_ids[]"]'), function (input) {
                if (timer.members.indexOf(input.value) !== -1) names.push(input.parentNode.textContent.trim());
            });
            panel.querySelector('.timer-members').textContent = names.join(', ');
        }
    }

    function filter() {
        var visible = 0;
        cards.forEach(function (card) {
            var running = !!timers[card.getAttribute('data-task')];
            var members = card.getAttribute('data-members').split(',');
            var matchesPerson = !person.value || members.indexOf(person.value) !== -1 || !card.getAttribute('data-members');
            var matchesPeriod = period.value === 'all' || card.getAttribute('data-today') === '1';
            card.hidden = !running && !(matchesPerson && matchesPeriod);
            if (!card.hidden) visible++;
        });
        document.getElementById('empty-filter').hidden = visible > 0 || cards.length === 0;
    }

    try { timers = restore(window.localStorage.getItem(storageKey)); }
    catch (ignore) { warning.hidden = false; }

    cards.forEach(function (card) {
        var id = card.getAttribute('data-task');
        var form = card.querySelector('.completion-form');
        if (!form) return;
        var error = card.querySelector('.selection-error');
        var start = card.querySelector('.start');
        start.hidden = false;
        if (timers[id]) {
            Array.prototype.forEach.call(form.querySelectorAll('input[name="member_ids[]"]'), function (input) {
                input.checked = timers[id].members.indexOf(input.value) !== -1;
            });
        }
        function validateSelection() {
            var valid = selected(card).length > 0;
            error.hidden = valid;
            if (!valid) error.focus();
            return valid;
        }
        start.addEventListener('click', function () {
            if (!validateSelection()) return;
            if (!timers[id]) timers[id] = { elapsed: 0, started: Date.now(), members: selected(card), completion: card.getAttribute('data-completion') };
            save(); paint(card); filter();
            card.querySelector('.timer').scrollIntoView(false);
        });
        card.querySelector('.pause').addEventListener('click', function () {
            var timer = timers[id];
            if (!timer) return;
            if (timer.started === null) timer.started = Date.now();
            else { timer.elapsed = elapsed(timer); timer.started = null; }
            save(); paint(card);
        });
        card.querySelector('.cancel').addEventListener('click', function () {
            if (!window.confirm('Annuler ce chronomètre ? La mission restera à faire.')) return;
            delete timers[id]; save(); paint(card); filter();
        });
        form.addEventListener('change', function () {
            error.hidden = true;
            if (timers[id]) { timers[id].members = selected(card); save(); paint(card); }
        });
        form.addEventListener('submit', function (event) {
            if (!validateSelection()) { event.preventDefault(); return; }
            // Clear only after the server confirms the completion on the next page.
            form.querySelector('button[type="submit"]').disabled = true;
        });
        paint(card);
    });
    document.getElementById('filters').hidden = false;
    period.addEventListener('change', filter);
    person.addEventListener('change', filter);
    filter(); save();
    window.setInterval(function () { cards.forEach(paint); }, 1000);
    document.addEventListener('visibilitychange', function () { cards.forEach(paint); });
    window.addEventListener('pageshow', function (event) {
        if (event.persisted) { window.location.reload(); return; }
        Array.prototype.forEach.call(board.querySelectorAll('button[type="submit"]'), function (button) { button.disabled = false; });
    });
    window.addEventListener('storage', function (event) {
        if (event.key !== storageKey) return;
        timers = restore(event.newValue);
        cards.forEach(function (card) {
            var timer = timers[card.getAttribute('data-task')];
            if (timer) Array.prototype.forEach.call(card.querySelectorAll('input[name="member_ids[]"]'), function (input) { input.checked = timer.members.indexOf(input.value) !== -1; });
            paint(card);
        });
        filter();
    });
}());
