"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import IAMService from "@/lib/IAMService";
import { InitCertResponse } from "@/lib/tidecloakApi";
import { RuleSettings } from "@/interfaces/interface";
import { TX_MANAGEMENT_CLIENT } from "@/app/constants/client";

interface AuthContextType {
    walletAddressHex: string,
    walletAddress: string,
    isAuthenticated: boolean | null;
    isLoading: boolean;
    vuid: string;
    hasRole: (role: string, clientId?: string) => boolean;
    createTxDraft: (txBody: string) => string;
    signTxDraft: (txBody: string, authorizers: string[], ruleSettings: string, expiry: string) => Promise<string>;
    createRuleSettingsDraft: (ruleSettings: string, previousRuleSetting: string, previousRuleSettingCert: string) => string;
    signRuleSettingsDraft: (ruleReq: string, authorizers: string[], ruleSettings: string, expiry: string, initCert: InitCertResponse) => Promise<string>;
    canProcessRequest: (
        ruleSettings: RuleSettings,
        draftJson: string
    ) => Promise<boolean>;
    processThresholdRules: (
        ruleSettings: RuleSettings,
        draftJson: string
    ) => Promise<{ roles: string[]; threshold: number } | null>;


}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [vuid, setVuid] = useState<string>("");
    const [walletAddress, setWalletAddress] = useState<string>("")
    const [walletAddressHex, setWalletAddressHex] = useState<string>("")


    const getWalletAddress = async () => {
        return await fetch("/api/dashboard?type=wallet", {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });
    };

    useEffect(() => {
        const initAuth = async () => {
            console.log("[DEBUG] Initializing IAM...");
            await IAMService.initIAM(async (authenticated) => {
                setIsAuthenticated(authenticated);
                setIsLoading(false);

                if (authenticated) {
                    const walletResp = await (await getWalletAddress()).json();
                    const vuidFromToken = IAMService.getVuid();
                    setVuid(vuidFromToken ?? "");
                    setWalletAddressHex(walletResp.addressHex ?? "")
                    setWalletAddress(walletResp.address ?? "")

                }
            });


        };
        initAuth();
    }, []);

    const hasRole = (role: string, clientId?: string): boolean => {
        return IAMService.hasRole(role, clientId);
    }

    const createTxDraft = (txBody: string) => {
        return IAMService.createTxDraft(txBody);
    }


    const signTxDraft = async (txBody: string, authorizers: string[], ruleSettings: string, expiry: string) => {
        return await IAMService.signTxDraft(txBody, authorizers, ruleSettings, expiry);
    }

    const createRuleSettingsDraft = (ruleSettings: string, previousRuleSetting: string, previousRuleSettingCert: string) => {
        return IAMService.createRuleSettingsDraft(ruleSettings, previousRuleSetting, previousRuleSettingCert);
    }


    const signRuleSettingsDraft = async (ruleReq: string, authorizers: string[], ruleSettings: string, expiry: string, initCert: InitCertResponse) => {
        return await IAMService.signRuleSettingsDraft(ruleReq, authorizers, ruleSettings, expiry, initCert);
    }

    const canProcessRequest = async (
        ruleSettings: any,
        draftJson: string
    ): Promise<boolean> => {
        const result: { roles: string[]; threshold: number } | null =
            await IAMService.processThresholdRules("CardanoTx:1.BlindSig:1", "threshold_rule", ruleSettings, draftJson);

        if (result == null) {
            return false;
        }
        return result.roles.some(r => hasRole(r, TX_MANAGEMENT_CLIENT));
    };

    const processThresholdRules = async (
        ruleSettings: any, // Replace `any` with your actual type if available, e.g., RuleSettings
        draftJson: string
    ): Promise<{ roles: string[]; threshold: number } | null> => {
        // Call the tidecloak.checkThresholdRule function with the provided parameters.
        return await IAMService.processThresholdRules("CardanoTx:1.BlindSig:1", "threshold_rule", ruleSettings, draftJson);
    };



    return (
        <AuthContext.Provider value={{ isAuthenticated, isLoading, hasRole, vuid, createTxDraft, signTxDraft, createRuleSettingsDraft, signRuleSettingsDraft, walletAddressHex, walletAddress, canProcessRequest, processThresholdRules }}>
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
