import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'net.eoloa.maisonet',
    appName: 'Maiso’net',
    webDir: 'mobile/dist',
    backgroundColor: '#b9efeb',
    loggingBehavior: 'none',
    // Bundle the UI. No remote server.url and no external WebView navigation.
    server: { androidScheme: 'https' },
    android: { allowMixedContent: false, webContentsDebuggingEnabled: false },
};

export default config;
