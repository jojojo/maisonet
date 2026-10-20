import assert from 'node:assert/strict';
import { test } from 'node:test';
import { elapsedAt, formatElapsed, parseTimer, pauseTimer, resumeTimer } from '../../resources/js/lib/kiosk-timer.ts';

const initial = { taskId: 1, memberId: 2, completionId: null, startedAt: 1000, elapsedMs: 0 };

test('elapsed time survives reloads and background suspension', () => {
    const restored = parseTimer(JSON.stringify(initial));
    assert.equal(elapsedAt(restored, 91000), 90000);
    assert.equal(formatElapsed(elapsedAt(restored, 91000)), '01:30');
});

test('pauses exclude rest time and repeated resumes do not lose elapsed time', () => {
    const paused = pauseTimer(initial, 61000);
    assert.equal(elapsedAt(paused, 121000), 60000);
    const resumed = resumeTimer(paused, 121000);
    assert.equal(elapsedAt(resumed, 151000), 90000);
    assert.deepEqual(resumeTimer(resumed, 131000), resumed);
    assert.equal(elapsedAt(pauseTimer(resumed, 151000), 500000), 90000);
});

test('invalid stored timers are discarded and clock corrections never subtract earned time', () => {
    for (const raw of ['broken', 'null', '{}', JSON.stringify({ ...initial, elapsedMs: -1 }), JSON.stringify({ ...initial, startedAt: 'yesterday' })])
        assert.equal(parseTimer(raw), null);
    assert.equal(elapsedAt({ ...initial, elapsedMs: 5000 }, 500), 5000);
});

test('display handles minutes and hours without resetting at an hour', () => {
    assert.equal(formatElapsed(999), '00:00');
    assert.equal(formatElapsed(3599000), '59:59');
    assert.equal(formatElapsed(3600000), '01:00:00');
    assert.equal(formatElapsed(90061000), '25:01:01');
});
