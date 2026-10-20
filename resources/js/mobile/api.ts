let transport: typeof fetch = (...args) => fetch(...args);

export function configureApiTransport(nativeTransport: typeof fetch): void {
    transport = nativeTransport;
}

export class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

export class MobileApi {
    private token: string | null;
    private expired: () => void;

    constructor(token: string | null, expired: () => void = () => {}) {
        this.token = token;
        this.expired = expired;
    }

    async request<T>(path: string, options: { body?: unknown; method?: string; signal?: AbortSignal } = {}): Promise<T> {
        if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Chemin API invalide.');
        let response: Response;
        try {
            response = await transport(`/api/v1${path}`, {
                method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
                credentials: 'omit',
                cache: 'no-store',
                headers: {
                    Accept: 'application/json',
                    ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
                    ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
                },
                ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
                signal: options.signal,
            });
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') throw error;
            throw new ApiError('Connexion impossible. Vérifie ton réseau puis réessaie.', 0);
        }
        if (response.status === 401 && this.token) this.expired();
        const data = response.status === 204 ? null : await response.json().catch(() => null);
        if (!response.ok) {
            const fieldErrors = data?.errors as Record<string, string[]> | undefined;
            const detail = fieldErrors ? Object.values(fieldErrors).flat().join(' ') : null;
            const message =
                response.status === 401
                    ? 'Ta session a expiré. Reconnecte-toi.'
                    : response.status === 429
                      ? 'Un petit instant… Trop de tentatives, réessaie dans une minute.'
                      : response.status >= 500
                        ? 'Le serveur ne répond pas correctement. Réessaie dans un instant.'
                        : detail || data?.message || 'Cette action n’a pas pu être effectuée.';
            throw new ApiError(message, response.status);
        }
        return data as T;
    }
}
