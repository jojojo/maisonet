import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

async function sources(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    return (
        await Promise.all(
            entries.map((entry) =>
                entry.isDirectory() ? sources(`${dir}/${entry.name}`) : /\.(tsx?|jsx?|css)$/.test(entry.name) ? [`${dir}/${entry.name}`] : [],
            ),
        )
    ).flat();
}

test('Bootstrap 5.3 is the only UI framework dependency', async () => {
    const manifest = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
    assert.match(manifest.dependencies.bootstrap, /^5\.3\./);
    assert.ok(manifest.dependencies['react-bootstrap']);
    for (const dependency of Object.keys({ ...manifest.dependencies, ...manifest.devDependencies })) {
        assert.doesNotMatch(dependency, /radix|headlessui|tailwind|class-variance-authority/);
    }
});

test('Views and shared components no longer import the removed UI stack', async () => {
    for (const file of await sources('resources/js')) {
        const source = await readFile(file, 'utf8');
        assert.doesNotMatch(source, /(?:from\s*|import\s*)['"](?:@radix-ui|@headlessui|tailwind|@\/components\/ui\/)/, file);
        assert.doesNotMatch(source, /(?:dark:|sm:|md:|lg:)(?:bg-|text-|flex|grid-cols-)/, file);
    }
    const css = await readFile('resources/css/app.css', 'utf8');
    assert.match(css, /bootstrap\/dist\/css\/bootstrap.min.css/);
    assert.doesNotMatch(css, /@(?:apply|tailwind|theme|custom-variant|plugin)\b/);
});
