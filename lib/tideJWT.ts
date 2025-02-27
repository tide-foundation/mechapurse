import { jwtVerify, createLocalJWKSet } from "jose";
import kcData from "../tidecloak.json";

export interface TokenPayload {
    email?: string;
    azp?: string;
    realm_access?: {
        roles: string[];
    };
    chatRooms?: string[];
    tideuserkey?: string;
    given_name?: string
}
const jwkData = kcData.jwk;
if (!jwkData) { 
  console.error("[TideJWT] No keys were found in tidecloak.json. Did you forget to download the client adaptor from TideCloak?"); 
}
const JWKS = jwkData ? createLocalJWKSet(jwkData) : null;

export async function verifyTideCloakToken(token: string, allowedRole: string): Promise<TokenPayload | null> {
    try {
        if(JWKS === null){
          throw new Error("No client adapter config found.");
        }
        if (!token) {
            throw new Error("No token found");
        }

        const issSlash = kcData["auth-server-url"].endsWith("/") ? "" : "/";
        const thisIssuer = `${kcData["auth-server-url"]}${issSlash}realms/${kcData["realm"]}`;

        const { payload } = await jwtVerify(token, JWKS, {
            issuer: thisIssuer,
        });

        console.log(payload)

        if (!payload || typeof payload !== "object") {
            throw new Error("Invalid token payload");
        }

        const typedPayload = payload as TokenPayload;

        if (typedPayload.azp !== kcData["resource"]) {
            throw new Error(`AZP attribute failed: '${kcData["resource"]}' isn't '${typedPayload.azp}'`);
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

export async function verifyAndDecodeAccessToken(token: string): Promise<TokenPayload | null> {
    try {
        const jwkData = kcData.jwk;
        const JWKS = createLocalJWKSet(jwkData);

        if (!token) {
            throw new Error("No token found");
        }

        const issSlash = kcData["auth-server-url"].endsWith("/") ? "" : "/";
        const thisIssuer = `${kcData["auth-server-url"]}${issSlash}realms/${kcData["realm"]}`;

        const { payload } = await jwtVerify(token, JWKS, {
            issuer: thisIssuer,
        });

        if (!payload || typeof payload !== "object") {
            throw new Error("Invalid token payload");
        }

        const typedPayload = payload as TokenPayload;

        if (typedPayload.azp !== kcData["resource"]) {
            throw new Error(`AZP attribute failed: '${kcData["resource"]}' isn't '${typedPayload.azp}'`);
        }

        return typedPayload;
    } catch (err) {
        console.error("[TideJWT] Token verification failed:", err);
        return null;
    }
}