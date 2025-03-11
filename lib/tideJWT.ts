import { jwtVerify, createLocalJWKSet } from "jose";
import { getAuthServerUrl, getJWK, getRealm, getResource } from "./tidecloakConfig";

export interface TokenPayload {
    email?: string;
    azp?: string;
    realm_access?: {
        roles: string[];
    };
    tideuserkey?: string;
    given_name?: string
}


export async function verifyTideCloakToken(token: string, allowedRole: string): Promise<TokenPayload | null> {
    try {
        const jwkData = getJWK();
        if (!jwkData) {
            console.error("[TideJWT] No JWK keys found in `tidecloak.json`.");
            console.error("[TideJWT] Ensure that the correct client adapter config is downloaded from TideCloak.");
            throw new Error("Missing JWK client adapter config. Update `tidecloak.json` with the correct JWK set.");
        }
        const JWKS = createLocalJWKSet(jwkData);
        const authServerUrl = getAuthServerUrl();
        const resource = getResource();
        const realm = getRealm();

        if (JWKS === null) {
            throw new Error("No client adapter config found.");
        }
        if (!token) {
            throw new Error("No token found");
        }

        const issSlash = authServerUrl.endsWith("/") ? "" : "/";
        const thisIssuer = `${authServerUrl}${issSlash}realms/${realm}`;

        const { payload } = await jwtVerify(token, JWKS, {
            issuer: thisIssuer,
        });

        if (!payload || typeof payload !== "object") {
            throw new Error("Invalid token payload");
        }

        const typedPayload = payload as TokenPayload;

        if (typedPayload.azp !== resource) {
            throw new Error(`AZP attribute failed: '${resource}' isn't '${typedPayload.azp}'`);
        }

        if (allowedRole !== "" && (!typedPayload.realm_access?.roles.includes(allowedRole))) {
            throw new Error(`Role match failed: '${typedPayload.realm_access?.roles}' has no '${allowedRole}'`);
        }

        return typedPayload;
    } catch (err) {
        console.error("[TideJWT] Token verification failed:", err);
        return null;
    }
}

// export async function verifyAndDecodeAccessToken(token: string): Promise<TokenPayload | null> {
//     try {
//         const jwkData = kcData.jwk;
//         const JWKS = createLocalJWKSet(jwkData);

//         if (!token) {
//             throw new Error("No token found");
//         }

//         const issSlash = kcData["auth-server-url"].endsWith("/") ? "" : "/";
//         const thisIssuer = `${kcData["auth-server-url"]}${issSlash}realms/${kcData["realm"]}`;

//         const { payload } = await jwtVerify(token, JWKS, {
//             issuer: thisIssuer,
//         });

//         if (!payload || typeof payload !== "object") {
//             throw new Error("Invalid token payload");
//         }

//         const typedPayload = payload as TokenPayload;

//         if (typedPayload.azp !== kcData["resource"]) {
//             throw new Error(`AZP attribute failed: '${kcData["resource"]}' isn't '${typedPayload.azp}'`);
//         }

//         return typedPayload;
//     } catch (err) {
//         console.error("[TideJWT] Token verification failed:", err);
//         return null;
//     }
// }