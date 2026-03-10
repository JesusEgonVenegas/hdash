"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    type ReactNode,
} from "react";
import { apiFetch } from "./api";
import type {
    User,
    AuthResponse,
    AuthState,
    LoginRequest,
    RegisterRequest,
} from "@/types/auth";

interface AuthContextType extends AuthState {
    login: (data: LoginRequest) => Promise<void>;
    register: (data: RegisterRequest) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "hdash_token";

export function AuthProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<AuthState>({
        user: null,
        token: null,
        isLoading: true,
        isAuthenticated: false,
    });

    useEffect(() => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) {
            setState((s) => ({ ...s, isLoading: false }));
            return;
        }

        apiFetch<User>("/api/auth/me", { token })
            .then((user) => {
                setState({
                    user,
                    token,
                    isLoading: false,
                    isAuthenticated: true,
                });
            })
            .catch(() => {
                localStorage.removeItem(TOKEN_KEY);
                document.cookie =
                    "hdash_token_exists=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                setState({
                    user: null,
                    token: null,
                    isLoading: false,
                    isAuthenticated: false,
                });
            });
    }, []);

    const login = useCallback(async (data: LoginRequest) => {
        const response = await apiFetch<AuthResponse>("/api/auth/login", {
            method: "POST",
            body: data,
        });

        localStorage.setItem(TOKEN_KEY, response.token);
        document.cookie = "hdash_token_exists=1; path=/; SameSite=Lax";

        setState({
            user: response.user,
            token: response.token,
            isLoading: false,
            isAuthenticated: true,
        });
    }, []);

    const register = useCallback(
        async (data: RegisterRequest) => {
            await apiFetch<{ message: string }>("/api/auth/register", {
                method: "POST",
                body: data,
            });

            await login({ email: data.email, password: data.password });
        },
        [login]
    );

    const logout = useCallback(() => {
        const currentToken = localStorage.getItem(TOKEN_KEY);
        localStorage.removeItem(TOKEN_KEY);
        document.cookie =
            "hdash_token_exists=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

        setState({
            user: null,
            token: null,
            isLoading: false,
            isAuthenticated: false,
        });

        if (currentToken) {
            apiFetch("/api/auth/logout", {
                method: "POST",
                token: currentToken,
            }).catch(() => {});
        }
    }, []);

    return (
        <AuthContext.Provider value={{ ...state, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
