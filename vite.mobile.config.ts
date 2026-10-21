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
            name: 'maisonet-bundled-branding',
            generateBundle() {
                for (const fileName of ['logo.png', 'mascot.png']) {
                    this.emitFile({ type: 'asset', fileName, source: readFileSync(new URL(`./public/${fileName}`, import.meta.url)) });
                }
            },
        },
    ],
    build: { outDir: 'dist', emptyOutDir: true },
});
