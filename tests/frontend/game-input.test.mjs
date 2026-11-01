import assert from 'node:assert/strict';
import test from 'node:test';
import { bindGamePointer } from '../../resources/js/lib/game-input.ts';
import { roundedRectPath } from '../../resources/js/lib/canvas.ts';

class Element extends EventTarget {
    closest() { return null; }
    setPointerCapture(id) { this.captured = id; }
}
function event(type, values) {
    const value = new Event(type, { cancelable: true });
    Object.entries(values).forEach(([key, item]) => Object.defineProperty(value, key, { value: item }));
    return value;
}

test('iOS touch gestures deliver coordinates, track one finger and clean up', () => {
    const original = globalThis.window;
    globalThis.window = new EventTarget();
    try {
        const element = new Element();
        const received = [];
        const remove = bindGamePointer(element, {
            down: (point) => received.push(['down', point.clientX, point.buttons]),
            move: (point) => received.push(['move', point.clientX, point.buttons]),
            up: (point) => received.push(['up', point.clientX, point.buttons]),
        });
        const touch = (type, id, x) => element.dispatchEvent(event(type, { changedTouches: [{ identifier: id, clientX: x, clientY: 20 }] }));
        touch('touchstart', 4, 10);
        touch('touchstart', 5, 100);
        touch('touchmove', 5, 150);
        touch('touchmove', 4, 30);
        touch('touchend', 4, 40);
        element.dispatchEvent(event('mousedown', { clientX: 40, clientY: 20 }));
        assert.deepEqual(received, [['down', 10, 1], ['move', 30, 1], ['up', 40, 0]]);
        remove();
        touch('touchstart', 4, 80);
        assert.equal(received.length, 3);
    } finally { globalThis.window = original; }
});

test('native pointer controls keep capture and cancel releases the game state', () => {
    const original = globalThis.window;
    globalThis.window = { PointerEvent: Event };
    try {
        const element = new Element();
        const received = [];
        const remove = bindGamePointer(element, { down: (point) => received.push(point.clientY), up: () => received.push('up') });
        element.dispatchEvent(event('pointerdown', { clientX: 2, clientY: 7, pointerId: 9, buttons: 1 }));
        element.dispatchEvent(event('pointercancel', { pointerId: 9 }));
        assert.equal(element.captured, 9);
        assert.deepEqual(received, [7, 'up']);
        remove();
    } finally { globalThis.window = original; }
});

test('rounded canvas paths work without roundRect and clamp the corner radius', () => {
    const calls = [];
    const context = {
        moveTo: (...args) => calls.push(['move', ...args]),
        arcTo: (...args) => calls.push(['arc', ...args]),
        closePath: () => calls.push(['close']),
    };
    roundedRectPath(context, 10, 20, 40, 10, 100);
    assert.deepEqual(calls[0], ['move', 15, 20]);
    assert.equal(calls.filter(([type]) => type === 'arc').length, 4);
    assert.ok(calls.filter(([type]) => type === 'arc').every((call) => call.at(-1) === 5));
    assert.deepEqual(calls.at(-1), ['close']);
});
