"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import IAMService from "@/lib/IAMService";

interface AuthContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    hasRole: (role: string, clientId?: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        const initAuth = async () => {
            console.log("[DEBUG] Initializing IAM...");
            await IAMService.initIAM(async (authenticated) => {
                setIsAuthenticated(authenticated);
                setIsLoading(false);
            });
        };
        initAuth();
    }, []);

    const hasRole = (role: string, clientId?: string): boolean => {
        return IAMService.hasRole(role, clientId);
    }


    return (
        <AuthContext.Provider value={{ isAuthenticated, isLoading, hasRole }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
