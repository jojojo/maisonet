import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-600.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
import { createRoot } from 'react-dom/client';
import { configureApiTransport } from './api';
import { MobileApp } from './mobile-app';
import './mobile.css';
import { initializeNativeEvents, isNative, nativeFetch, nativePlatform, nativeSessionStore } from './native-runtime';

if (isNative) {
    configureApiTransport(nativeFetch);
    void initializeNativeEvents();
}

createRoot(document.getElementById('mobile-root')!).render(
    <MobileApp storage={isNative ? nativeSessionStore : undefined} platform={isNative ? nativePlatform : 'web'} />,
);
