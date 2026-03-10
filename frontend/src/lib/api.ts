const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5063";

type RequestOptions = {
    method?: string;
    body?: unknown;
    token?: string | null;
    headers?: Record<string, string>;
};

export async function apiFetch<T>(
    endpoint: string,
    options: RequestOptions = {}
): Promise<T> {
    const { method = "GET", body, token, headers = {} } = options;

    const config: RequestInit = {
        method,
        headers: {
            "Content-Type": "application/json",
            ...headers,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
    };

    const response = await fetch(`${API_BASE}${endpoint}`, config);

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new ApiError(response.status, error);
    }

    return response.json() as Promise<T>;
}

export class ApiError extends Error {
    constructor(
        public status: number,
        public data: Record<string, unknown>
    ) {
        super(`API Error: ${status}`);
        this.name = "ApiError";
    }
}
