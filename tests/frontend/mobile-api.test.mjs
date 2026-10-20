import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { ApiError, MobileApi } from '../../resources/js/mobile/api.ts';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test('mobile requests use bearer credentials and never send the web session cookies', async () => {
    let captured;
    globalThis.fetch = async (url, options) => { captured = { url, options }; return Response.json({ data: { id: 1 } }); };
    await new MobileApi('secret').request('/tasks/1/complete', { body: { member_ids: [3] } });
    assert.equal(captured.url, '/api/v1/tasks/1/complete');
    assert.equal(captured.options.credentials, 'omit');
    assert.equal(captured.options.cache, 'no-store');
    assert.equal(captured.options.headers.Authorization, 'Bearer secret');
    assert.deepEqual(JSON.parse(captured.options.body), { member_ids: [3] });
});

test('an expired bearer invalidates the local session, but validation failures do not', async () => {
    let invalidations = 0;
    const api = new MobileApi('secret', () => invalidations++);
    globalThis.fetch = async () => Response.json({ message: 'Unauthenticated.' }, { status: 401 });
    await assert.rejects(api.request('/me'), error => error instanceof ApiError && error.status === 401);
    assert.equal(invalidations, 1);
    globalThis.fetch = async () => Response.json({ errors: { member_ids: ['Choisis un participant.'] } }, { status: 422 });
    await assert.rejects(api.request('/tasks/1/complete', { body: {} }), { message: 'Choisis un participant.' });
    assert.equal(invalidations, 1);
});

test('logout accepts an empty 204; network failures and cancellation remain distinguishable', async () => {
    const api = new MobileApi('secret');
    globalThis.fetch = async () => new Response(null, { status: 204 });
    assert.equal(await api.request('/auth/logout', { method: 'POST' }), null);
    globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
    await assert.rejects(api.request('/me'), error => error instanceof ApiError && error.status === 0);
    globalThis.fetch = async () => { throw new DOMException('Aborted', 'AbortError'); };
    await assert.rejects(api.request('/me'), { name: 'AbortError' });
});

test('a request cannot redirect the bearer to an external URL', async () => {
    let calls = 0;
    globalThis.fetch = async () => { calls++; return Response.json({}); };
    const api = new MobileApi('secret');
    for (const path of ['https://example.invalid/me', '//example.invalid/me']) await assert.rejects(api.request(path));
    assert.equal(calls, 0);
});
