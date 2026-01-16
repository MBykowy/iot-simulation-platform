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
 * Centralized API Client.
 * Throws errors to allow callers to handle loading states.
 * Automatically dispatches generic error messages to Snackbar.
 */
export async function apiClient<T>(endpoint: string, options: RequestOptions = { method: 'GET' }): Promise<T> {
    const { showSnackbar } = useAppStore.getState();

    try {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        let body: string | undefined;
        if (options.body) {
            body = JSON.stringify(options.body);
        }

        const response = await fetch(`${API_URL}${endpoint}`, {
            method: options.method,
            headers,
            body,
        });

        //  Handle Application Errors
        if (!response.ok) {
            let errorMessage = `Request failed: ${response.status} ${response.statusText}`;
            try {
                // parse backend dto errors
                const errorData = (await response.json()) as { message?: string };
                if (errorData?.message) {
                    errorMessage = errorData.message;
                }
            } catch {
                //use generic messange
            }
            throw new Error(errorMessage);
        }

        // empty
        const contentLength = response.headers.get('content-length');
        if (response.status === HTTP_NO_CONTENT || contentLength === '0') {
            return {} as T;
        }

        //  json
        const text = await response.text();
        if (!text) {
            return {} as T;
        }

        return JSON.parse(text) as T;

    } catch (error) {
        let message = 'Network error occurred.';
        if (error instanceof Error) {
            message = error.message;
        }

        showSnackbar(message, 'error');

        // stop loading spinners
        throw error;
    }
}