"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import IAMService from "@/lib/IAMService";

interface AuthContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    hasRole: (role: string, clientId?: string) => boolean;
    vuid: string;
    createTxDraft: (txBody: string) => string;

}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [vuid, setVuid] = useState<string>("");

    useEffect(() => {
        const initAuth = async () => {
            console.log("[DEBUG] Initializing IAM...");
            await IAMService.initIAM(async (authenticated) => {
                setIsAuthenticated(authenticated);
                setIsLoading(false);
            });
            const vuidFromToken = IAMService.getVuid();
            setVuid(vuidFromToken ?? "");
        };
        initAuth();
    }, []);

    const hasRole = (role: string, clientId?: string): boolean => {
        return IAMService.hasRole(role, clientId);
    }

    const createTxDraft = (txBody: string) => {
        console.log("hello")
        return IAMService.createTxDraft(txBody);
    }


    return (
        <AuthContext.Provider value={{ isAuthenticated, isLoading, hasRole, vuid, createTxDraft }}>
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
