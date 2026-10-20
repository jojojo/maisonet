import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
    root: fileURLToPath(new URL('./mobile', import.meta.url)),
    base: './',
    publicDir: false,
    envDir: false,
    plugins: [
        react(),
        {
            name: 'maisonet-bundled-logo',
            generateBundle() {
                this.emitFile({ type: 'asset', fileName: 'logo.png', source: readFileSync(new URL('./public/logo.png', import.meta.url)) });
            },
        },
    ],
    build: { outDir: 'dist', emptyOutDir: true },
});
