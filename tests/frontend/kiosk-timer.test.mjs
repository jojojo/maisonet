import assert from 'node:assert/strict';
import { test } from 'node:test';
import { elapsedAt, formatElapsed, parseTimer, parseTimers, pauseTimer, resumeTimer, startTaskTimer, pauseTaskTimer, resumeTaskTimer, removeTaskTimer } from '../../resources/js/lib/kiosk-timer.ts';

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

test('several missions run independently and starting the same mission preserves its time and participant', () => {
    const second = { ...initial, taskId: 3, memberId: 4, startedAt: 31000 };
    const timers = startTaskTimer(startTaskTimer([], initial), second);
    assert.equal(elapsedAt(timers[0], 61000), 60000);
    assert.equal(elapsedAt(timers[1], 61000), 30000);
    assert.deepEqual(startTaskTimer(timers, { ...initial, memberId: 9, startedAt: 61000 }), timers);

    const paused = pauseTaskTimer(timers, 1, 61000);
    assert.equal(elapsedAt(paused[0], 121000), 60000);
    assert.equal(elapsedAt(paused[1], 121000), 90000);
    const resumed = resumeTaskTimer(paused, 1, 121000);
    assert.equal(elapsedAt(resumed[0], 151000), 90000);
    assert.equal(elapsedAt(resumed[1], 151000), 120000);
    assert.deepEqual(removeTaskTimer(resumed, 1), [second]);
    assert.deepEqual(removeTaskTimer(resumed, 999), resumed);
});

test('all timers and pauses survive reloads, including the previous single-timer storage', () => {
    assert.deepEqual(parseTimers(JSON.stringify(initial)), [initial]);
    const timers = [pauseTimer(initial, 61000), { ...initial, taskId: 3, memberId: 4 }];
    const restored = parseTimers(JSON.stringify(timers));
    assert.deepEqual(restored, timers);
    assert.equal(elapsedAt(restored[0], 121000), 60000);
    assert.equal(elapsedAt(restored[1], 121000), 120000);
    assert.deepEqual(parseTimers(JSON.stringify([initial, { ...initial, startedAt: 9000 }, { taskId: 2 }, null])), [initial]);
    for (const raw of ['broken', 'null', '{}', '[]']) assert.deepEqual(parseTimers(raw), []);
});

test('finishing or cancelling one mission leaves the other saved timers intact', () => {
    const second = { ...initial, taskId: 3, memberId: 4 };
    const third = { ...initial, taskId: 5, memberId: 6, startedAt: null, elapsedMs: 45000 };
    const timers = parseTimers(JSON.stringify([initial, second, third]));
    const remaining = removeTaskTimer(timers, second.taskId);
    assert.deepEqual(parseTimers(JSON.stringify(remaining)), [initial, third]);
    assert.deepEqual(removeTaskTimer(removeTaskTimer(remaining, initial.taskId), third.taskId), []);
});
