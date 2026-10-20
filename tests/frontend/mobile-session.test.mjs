import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { browserSessionStore, validSession } from '../../resources/js/mobile/session-store.ts';

afterEach(async () => { await browserSessionStore.write(null); delete globalThis.sessionStorage; });

test('expired, malformed and empty tokens cannot restore an authenticated session', () => {
    const expiresAt = new Date(Date.now() + 60000).toISOString();
    assert.equal(validSession({ token: 'valid-token', expiresAt }), true);
    for (const value of [null, {}, 'token', { token: '', expiresAt }, { token: 'x', expiresAt: 'invalid' }, { token: 'x', expiresAt: new Date(0).toISOString() }]) {
        assert.equal(validSession(value), false);
    }
});

test('browser logout removes the stored token and clears the memory fallback', async () => {
    const values = new Map();
    globalThis.sessionStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
    await browserSessionStore.write({ token: 'secret', expiresAt: new Date(Date.now() + 60000).toISOString() });
    assert.equal(values.size, 1);
    await browserSessionStore.write(null);
    assert.equal(values.size, 0);
    delete globalThis.sessionStorage;
    assert.equal(await browserSessionStore.read(), null);
});

test('browser privacy mode can keep a session only in memory without crashing', async () => {
    globalThis.sessionStorage = { getItem() { throw Error('Blocked'); }, setItem() { throw Error('Blocked'); }, removeItem() { throw Error('Blocked'); } };
    const session = { token: 'memory-only', expiresAt: new Date(Date.now() + 60000).toISOString() };
    await browserSessionStore.write(session);
    assert.deepEqual(await browserSessionStore.read(), session);
});
