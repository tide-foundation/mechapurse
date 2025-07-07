import TideCloak from "tidecloak-js";
import { getAuthServerUrl, getHomeOrkUrl, getRealm, getResource, getVendorId, tidecloakConfig } from "./tidecloakConfig";
import { InitCertResponse } from "./tidecloakApi";
import { RuleSettings } from "@/interfaces/interface";


let _tc: typeof TideCloak | null = null;

function getKeycloakClient(): typeof TideCloak {
    if (!_tc) {
        console.log("[DEBUG V1] Initializing TideCloak client...");
        const config: ReturnType<typeof tidecloakConfig> = tidecloakConfig();
        console.log("[DEBUG] Tidecloak Config:", config);
        _tc = new TideCloak({ ...config });

        if (!_tc) {
            console.error("[ERROR] TideCloak client failed to initialize!");
        } else {
            console.log("[DEBUG] TideCloak client initialized:", _tc);
        }
    }
    return _tc;
}


export const updateIAMToken = async (): Promise<void> => {
    const keycloak = getKeycloakClient();

    if (!keycloak) {
        throw new Error("Keycloak is undefined");
    }

    try {
        const refreshed = await keycloak.updateToken(300);
        if (refreshed) {
            const tokenExp = keycloak.tokenParsed?.exp ?? 0;
            const timeSkew = keycloak.timeSkew ?? 0;

            console.debug(
                `[updateIAMToken] Token refreshed: ${Math.round(
                    tokenExp + timeSkew - new Date().getTime() / 1000
                )} seconds`
            );

            if (typeof window !== "undefined") {
                document.cookie = `kcToken=${keycloak.token}; path=/;`;
            }
        } else {
            console.debug("[updateIAMToken] Token was not refreshed.");
        }
    } catch (err) {
        console.error("[updateIAMToken] Failed to refresh token", err);
        throw err;
    }
}

export const initIAM = async (onReadyCallback?: (authenticated: boolean) => void): Promise<void> => {
    try {
        const keycloak = await getKeycloakClient();

        if (typeof window === "undefined") {
            return;
        }

        if (keycloak.didInitialize) {
            if (onReadyCallback) onReadyCallback(keycloak.authenticated ?? false);
            return;
        }


        // Ensure token refresh automatically
        keycloak.onTokenExpired = async () => {
            console.log("[DEBUG] Token expired, attempting refresh...");
            try {
                await updateIAMToken();
                console.log("[DEBUG] Token successfully refreshed.");
            } catch (refreshError) {
                console.error("[ERROR] Failed to refresh token:", refreshError);
            }
        };

        // Run Keycloak initialization
        const authenticated = await keycloak.init({
            onLoad: "check-sso",
            silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
            pkceMethod: "S256",
        });

        console.log("[DEBUG] Keycloak authentication result:", authenticated);

        // Store token if authenticated
        if (authenticated && keycloak.token) {
            document.cookie = `kcToken=${keycloak.token}; path=/; Secure; SameSite=Strict`;
        }
        if (onReadyCallback) onReadyCallback(authenticated);
    } catch (err) {
        console.error("[ERROR] Keycloak initialization failed:", err);
        throw new Error("[ERROR] Keycloak initialization failed:" + err)
    }
};



export const doLogin = (): void => {
    const keycloak = getKeycloakClient();
    keycloak.login({ redirectUri: window.location.origin + "/auth/redirect" });
};

export const doLogout = (): void => {
    const keycloak = getKeycloakClient();
    document.cookie = "kcToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    keycloak.logout({ redirectUri: window.location.origin + "/auth/redirect" });
};

export const isLoggedIn = (): boolean => {
    const keycloak = getKeycloakClient();
    return !!keycloak.token;
};

export const getToken = async (): Promise<string | null> => {
    const keycloak = getKeycloakClient();
    if (keycloak) {
        const tokenExp = getTokenExp();
        if (tokenExp < 3) {
            try {
                await updateIAMToken();
                console.debug("Refreshed the token");
            } catch (error) {
                console.error("Failed to refresh the token", error);
                keycloak.logout();
                return null;
            }
        }
        return keycloak.token ?? null;
    }
    return null;
};

export const getName = (): string | undefined => {
    const keycloak = getKeycloakClient();
    return keycloak.tokenParsed?.preferred_username;
};

export const getVuid = (): string | undefined => {
    const keycloak = getKeycloakClient();
    return keycloak.tokenParsed?.vuid;
};


export const getTokenExp = (): number => {
    const keycloak = getKeycloakClient();
    if (!keycloak) {
        throw new Error("Keycloak is undefined");
    }
    const tokenExp = keycloak.tokenParsed?.exp ?? 0;
    const timeSkew = keycloak.timeSkew ?? 0;

    return Math.round(
        tokenExp + timeSkew - new Date().getTime() / 1000
    );
};

export const hasOneRole = (role: string): boolean => {
    const keycloak = getKeycloakClient();
    return keycloak.hasRealmRole(role);
};

export const hasRole = (role: string, client?: string): boolean => {
    const keycloak = getKeycloakClient();

    return keycloak.hasRealmRole(role) || keycloak.hasResourceRole(role, client);
}

export const signModel = async (dataToAuthorize: string, proof: string, vvkId: string) => {
    const tidecloak = getKeycloakClient();
    if (!tidecloak) { return null; }

    return await tidecloak.signModel(vvkId, dataToAuthorize, proof);
}

export const createTxDraft = (txBody: string) => {
    const tidecloak = getKeycloakClient();
    if (!tidecloak) { return null; }

    return tidecloak.createCardanoTxDraft(txBody);
}

export const signTxDraft = async (txBody: string, authorizers: string[], ruleSettings: string, expiry: string) => {
    const tidecloak = getKeycloakClient();
    if (!tidecloak) { return null; }

    return await tidecloak.signCardanoTx(txBody, authorizers, ruleSettings, expiry);

}

/**
 * Processes threshold rules using the Tidecloak checkThresholdRule method.
 *
 * @param key - The key in the validationSettings where the rule sets are stored (e.g., "CardanoTx:1.BlindSig:1").
 * @param idSubscript - The substring that must be present in the ruleSetId (e.g., "threshold_rule").
 * @param ruleSettings - The full rule settings configuration object.
 * @param draftJson - The JSON string representing the draft transaction.
 * @returns A Promise that resolves with an object containing the required role and threshold if a rule set passes, or null otherwise.
 */
export const processThresholdRules = async (
    key: string,
    idSubscript: string,
    ruleSettings: RuleSettings,
    draftJson: string
  ): Promise<{ roles: string[]; threshold: number } | null> => {
    const tidecloak = getKeycloakClient();
    if (!tidecloak) { return null; }
    return await tidecloak.checkThresholdRule(key, idSubscript, ruleSettings, draftJson);
  };

export const createRuleSettingsDraft = (ruleSettings: string, previousRuleSetting: string, previousRuleSettingCert: string) => {
    const tidecloak = getKeycloakClient();
    if (!tidecloak) { return null; }

    return tidecloak.createRuleSettingsDraft(ruleSettings, previousRuleSetting, previousRuleSettingCert);
}

const IAMService = {
    initIAM,
    doLogin,
    doLogout,
    isLoggedIn,
    getToken,
    getName,
    hasOneRole,
    getTokenExp,
    signModel,
    hasRole,
    getVuid,
    createTxDraft,
    signTxDraft,
    createRuleSettingsDraft,
    processThresholdRules
};

export default IAMService;
