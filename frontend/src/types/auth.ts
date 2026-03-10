export interface User {
    id: string;
    email: string;
    displayName: string;
    householdId: string | null;
    householdName: string | null;
}

export interface AuthResponse {
    token: string;
    expiration: string;
    user: User;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    displayName: string;
}

export interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
}
