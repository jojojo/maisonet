import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../../resources/js/lib/routes.ts', import.meta.url), 'utf8');
const compiled = ts
    .transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } })
    .outputText.replace(/(['"])ziggy-js\1/g, JSON.stringify(import.meta.resolve('ziggy-js')));
const { makeBrowserRoute } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const config = {
    url: 'https://example.test',
    port: null,
    defaults: {},
    routes: {
        'kiosk.enter': { uri: 'kiosk/enter', methods: ['POST'] },
        'tasks.update': { uri: 'tasks/{task}', methods: ['PUT'], bindings: { task: 'id' } },
    },
};

test('browser routes work without a global Ziggy object', () => {
    assert.equal(globalThis.Ziggy, undefined);
    const route = makeBrowserRoute(config);
    assert.equal(route('kiosk.enter'), 'https://example.test/kiosk/enter');
    assert.equal(route('tasks.update', { task: { id: 42 } }), 'https://example.test/tasks/42');
    assert.equal(route().has('kiosk.enter'), true);
    assert.equal(route().has('missing'), false);
});

test('explicit per-call configurations and relative links retain Ziggy behavior', () => {
    const route = makeBrowserRoute(config);
    assert.equal(route('kiosk.enter', undefined, false), '/kiosk/enter');
    assert.equal(route('kiosk.enter', undefined, true, { ...config, url: 'https://other.test' }), 'https://other.test/kiosk/enter');
});
