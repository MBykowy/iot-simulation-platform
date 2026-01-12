import { useAppStore } from '../stores/appStore';

const API_URL = import.meta.env.VITE_API_URL || globalThis.location.origin;
const HTTP_NO_CONTENT = 204;

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface RequestOptions {
    method: HttpMethod;
    headers?: Record<string, string>;
    body?: unknown;
}

/**
 * Client API handling fetch calls, response parsing,
 * and error handling via Snackbar.
 */
export async function apiClient<T>(endpoint: string, options: RequestOptions): Promise<T | null> {
    const { showSnackbar } = useAppStore.getState();

    try {
        let requestBody: string | null = null;
        if (options.body) {
            requestBody = JSON.stringify(options.body);
        }

        const response = await fetch(`${API_URL}${endpoint}`, {
            method: options.method,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            body: requestBody,
        });

        if (!response.ok) {
            const errorData = (await response.json().catch(() => null)) as Record<string, unknown> | null;

            let errorMessage = `Request failed with status ${response.status}`;
            if (errorData && typeof errorData.message === 'string') {
                errorMessage = errorData.message;
            }

            throw new Error(errorMessage);
        }

        if (response.status === HTTP_NO_CONTENT) {
            return {} as T;
        }

        return (await response.json()) as T;

    } catch (error) {
        let message = 'An unknown network error occurred.';
        if (error instanceof Error) {
            message = error.message;
        }
        showSnackbar(message, 'error');
        return null;
    }
}