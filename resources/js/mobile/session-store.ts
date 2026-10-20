import type { Session } from './types';

export interface SessionStore {
    read(): Promise<unknown>;
    write(session: Session | null): Promise<void>;
}

export function validSession(value: unknown): value is Session {
    if (!value || typeof value !== 'object') return false;
    const session = value as Partial<Session>;
    return (
        typeof session.token === 'string' &&
        session.token.length > 0 &&
        typeof session.expiresAt === 'string' &&
        Date.parse(session.expiresAt) > Date.now()
    );
}

const sessionKey = 'maisonet:mobile-session:v1';
let memorySession: Session | null = null;
export const browserSessionStore: SessionStore = {
    async read() {
        try {
            return JSON.parse(sessionStorage.getItem(sessionKey) ?? 'null');
        } catch {
            return memorySession;
        }
    },
    async write(session) {
        memorySession = session;
        try {
            if (session) sessionStorage.setItem(sessionKey, JSON.stringify(session));
            else sessionStorage.removeItem(sessionKey);
        } catch {
            /* Browser-only fallback. The native implementation never writes here. */
        }
    },
};
