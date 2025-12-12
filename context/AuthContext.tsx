"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PIN_MAPPING, User } from "@/lib/types";

interface AuthContextType {
    user: User | null;
    login: (pin: string) => boolean;
    logout: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // Check for existing session
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = (pin: string) => {
        const name = PIN_MAPPING[pin];
        if (name) {
            const newUser: User = {
                name,
                pin,
                isAuthenticated: true,
            };
            setUser(newUser);
            localStorage.setItem("user", JSON.stringify(newUser));
            // Also set the cookie for middleware compatibility if needed, 
            // though we are primarily using client-side auth for this requirement.
            document.cookie = "auth=true; path=/; max-age=86400";
            return true;
        }
        return false;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem("user");
        document.cookie = "auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        router.push("/login");
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
