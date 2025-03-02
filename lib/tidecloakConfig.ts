import kcData from "../tidecloak.json";

interface JSONWebKeySet {
    keys: JWK[];
}

interface JWK {
    kid: string;
    kty: string;
    alg: string;
    use: string;
    crv: string;
    x: string;
}

/**
 * Get Keycloak Authentication Server URL
 */
export function getAuthServerUrl(): string {
    return kcData["auth-server-url"] || "";
}

/**
 * Get Keycloak Realm Name
 */
export function getRealm(): string {
    return kcData["realm"] || "";
}

/**
 * Get Vendor ID
 */
export function getVendorId(): string {
    return kcData["vendorId"] || "";
}

/**
 * Get Resource
 */
export function getResource(): string {
    return kcData["resource"] || "";
}

/**
export function getJWK(): JSONWebKeySet | null {
 */
export function getJWK(): JSONWebKeySet | null {
    if (!kcData.jwk || !kcData.jwk.keys || kcData.jwk.keys.length === 0) {
        console.error("[TideJWT] No keys were found in tidecloak.json. Did you forget to download the client adaptor from TideCloak?");
        return null;
    }
    return kcData.jwk;
}

/**
 * Get Tidecloak Public Key (JWK 'x' value)
 * @returns {string} The Base64URL-encoded public key
 * @throws {Error} If no JWK is found
 */
export function getPublicKey(): string {
    const jwkSet = getJWK();

    if (!jwkSet || !jwkSet.keys || jwkSet.keys.length === 0) {
        throw new Error("[Tidecloak JWK] No JWK keys found in tidecloak.json. Make sure you downloaded the correct client adapter.");
    }

    const jwk = jwkSet.keys[0];
    if (!jwk.x) {
        throw new Error("[Tidecloak JWK] JWK 'x' value is missing. Check tidecloak.json.");
    }

    return jwk.x;
}
