import { KeychainAccess, SecureStorage } from '@aparajita/capacitor-secure-storage';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import type { SessionStore } from './session-store';

export const websiteOrigin = 'https://maisonet.eoloa.net';
export const nativePlatform = Capacitor.getPlatform();
export const isNative = Capacitor.isNativePlatform();

const setupStorage = async () => {
    await SecureStorage.setKeyPrefix('maisonet_');
    await SecureStorage.setSynchronize(false);
    await SecureStorage.setDefaultKeychainAccess(KeychainAccess.whenUnlockedThisDeviceOnly);
};
let storageReady: Promise<void> | null = null;
function ready() {
    // Retry initialization after a temporary system/keychain failure.
    storageReady ??= setupStorage().catch((error) => {
        storageReady = null;
        throw error;
    });
    return storageReady;
}
export const nativeSessionStore: SessionStore = {
    async read() {
        await ready();
        return SecureStorage.get('session', false, false);
    },
    async write(session) {
        await ready();
        if (session) await SecureStorage.set('session', { ...session }, false);
        else await SecureStorage.remove('session', false);
    },
};

// Explicit native HTTP avoids CORS and keeps the WebView on its bundled origin.
export const nativeFetch: typeof fetch = async (input, options = {}) => {
    if (typeof input !== 'string' || !input.startsWith('/api/v1/')) throw new Error('Chemin API invalide.');
    const signal = options.signal;
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const operation = CapacitorHttp.request({
        url: `${websiteOrigin}${input}`,
        method: options.method ?? 'GET',
        headers: options.headers as Record<string, string>,
        ...(options.body ? { data: JSON.parse(String(options.body)) } : {}),
        responseType: 'json',
        connectTimeout: 15000,
        readTimeout: 20000,
        disableRedirects: true,
    });
    return new Promise<Response>((resolve, reject) => {
        const aborted = () => reject(new DOMException('Aborted', 'AbortError'));
        signal?.addEventListener('abort', aborted, { once: true });
        operation
            .then((result) => {
                if (signal?.aborted) return;
                const body = result.status === 204 ? null : typeof result.data === 'string' ? result.data : JSON.stringify(result.data);
                resolve(new Response(body, { status: result.status, headers: result.headers }));
            })
            .catch(reject)
            .finally(() => signal?.removeEventListener('abort', aborted));
    });
};

export async function initializeNativeEvents() {
    await App.addListener('backButton', async () => {
        if (document.querySelector('[role="dialog"]')) {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
            return;
        }
        const event = new Event('maisonet:back', { cancelable: true });
        if (window.dispatchEvent(event)) await App.minimizeApp();
    });
    await App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) window.dispatchEvent(new Event('maisonet:resume'));
    });
    document.addEventListener('click', (event) => {
        const anchor = (event.target as Element).closest('a');
        if (!anchor) return;
        const path = anchor.getAttribute('href');
        if (!path?.startsWith('/')) return;
        event.preventDefault();
        if (path === '/mobile' || path === '/login') return;
        // Authentication is independent in the external browser. Never put the bearer in a URL.
        void Browser.open({ url: `${websiteOrigin}${path}` });
    });
}
