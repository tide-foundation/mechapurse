import { NextRequest, NextResponse } from "next/server";
import { createApprovalURI, getAdminThreshold, getRealmKeyRules, getTransactionRoles, saveAndSignRules } from "@/lib/tidecloakApi";
import { verifyTideCloakToken } from "@/lib/tideJWT";
import { cookies } from "next/headers";
import { Roles } from "@/app/constants/roles";
import { RoleRepresentation } from "@/lib/keycloakTypes";
import { RuleDefinition, RuleSettings } from "@/interfaces/interface";
import { AddRuleConfiguration, GetRuleSettingsAuthorizationById } from "@/lib/db";
import { base64ToBytes, bytesToBase64 } from "tidecloak-js";

const allowedRole = [Roles.Admin];

export async function GET(req: NextRequest) {
    try {
        // Verify authorization token
        const cookieStore = cookies();
        const token = (await cookieStore).get("kcToken")?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await verifyTideCloakToken(token, allowedRole);
        if (!user) {
            return NextResponse.json({ error: "Invalid token" }, { status: 403 });
        }

        // Get the rules container that matches your RuleSettings interface.
        const rules = (await getRealmKeyRules(token)).rules;
        return NextResponse.json(rules);
    } catch (error) {
        console.error("Error fetching roles:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}


export async function POST(req: NextRequest) {
    try {
        // Verify authorization token
        const cookieStore = cookies();
        const token = (await cookieStore).get("kcToken")?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await verifyTideCloakToken(token, allowedRole);
        if (!user) {
            return NextResponse.json({ error: "Invalid token" }, { status: 403 });
        }

        const settings: RuleSettings = await req.json();

        // Check for existing rule from keycloak
        const realmKeysConfig = await getRealmKeyRules(token);

        if (realmKeysConfig.rulesCert !== "") {
            settings.previousVersion = bytesToBase64(base64ToBytes(realmKeysConfig.rulesCert).slice(32, 64)); // start at index 32 and return length 32
        }

        // Convert settings back to JSON if needed
        const updatedSettings = JSON.stringify(settings);

        const threshold = await getAdminThreshold(token);
        const approvalUri = await createApprovalURI(token);
        return NextResponse.json({ settings: updatedSettings, threshold: threshold, uri: approvalUri.customDomainUri, previousRuleSetting: JSON.stringify(realmKeysConfig.rules), previousRuleSettingCert: realmKeysConfig.rulesCert, voucherUrl: approvalUri.voucherUrl });
    } catch (error) {
        console.error("Error saving global rules:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
