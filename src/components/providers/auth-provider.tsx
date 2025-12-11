"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface AuthContextValue {
    isLoggedIn: boolean;
    isLoading: boolean;
    isProtectionEnabled: boolean;
    login: (password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isProtectionEnabled, setIsProtectionEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Check login status on mount
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await fetch("/api/auth/status");
                if (res.ok) {
                    const data = await res.json();
                    setIsLoggedIn(data.isLoggedIn);
                    setIsProtectionEnabled(data.protectionEnabled);
                }
            } catch (error) {
                console.error("Failed to check auth status", error);
            } finally {
                setIsLoading(false);
            }
        };
        checkStatus();
    }, []);

    const login = async (password: string) => {
        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            });

            if (res.ok) {
                setIsLoggedIn(true);
                return { success: true };
            } else {
                const data = await res.json();
                return { success: false, error: data.error || "Login failed" };
            }
        } catch (error) {
            return { success: false, error: "Network error" };
        }
    };

    const logout = async () => {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
            setIsLoggedIn(false);
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                isLoggedIn,
                isLoading,
                isProtectionEnabled,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
