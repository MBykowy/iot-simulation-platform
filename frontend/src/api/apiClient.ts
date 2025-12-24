import {useAppStore} from '../stores/appStore';

const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface RequestOptions {
    method: HttpMethod;
    headers?: Record<string, string>;
    body?: any;
}

/**
 * klient API, który obsługuje wywołania fetch,
 * parsowanie odpowiedzi i obsługę błędów przez Snackbar.
 */
export async function apiClient<T>(endpoint: string, options: RequestOptions): Promise<T | null> {
    const { showSnackbar } = useAppStore.getState();

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: options.method,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            body: options.body ? JSON.stringify(options.body) : null,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            const errorMessage = errorData?.message || `Request failed with status ${response.status}`;
            throw new Error(errorMessage);
        }

        if (response.status === 204) {
            return {} as T;
        }

        return await response.json() as T;

    } catch (error) {
        const message = error instanceof Error ? error.message : 'An unknown network error occurred.';
        console.error(`API Client Error: ${message}`);
        showSnackbar(message, 'error');
        return null;
    }
}