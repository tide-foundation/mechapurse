import { NextRequest, NextResponse } from "next/server";
import { createApprovalURI, getAdminThreshold, getRealmKeyRules, getTransactionRoles, getUserByVuid, saveAndSignRules } from "@/lib/tidecloakApi";
import { verifyTideCloakToken } from "@/lib/tideJWT";
import { cookies } from "next/headers";
import { Roles } from "@/app/constants/roles";
import { RoleRepresentation } from "@/lib/keycloakTypes";
import { RuleDefinition, RuleSettingDraft, RuleSettings } from "@/interfaces/interface";
import { AddRuleConfiguration, GetRuleSettingsDraft, GetRuleSettingsDraftById } from "@/lib/db";
import { base64ToBytes, bytesToBase64, getHumanReadableObject } from "@/external/tidecloak-js/lib/heimdall";




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

        const settings = await GetRuleSettingsDraft();
        if (settings === null) {
            return NextResponse.json({});
        }
        const humanReadableObj = await Promise.all(settings.map(async setting => {
            // GET USER
            const user = await getUserByVuid(setting.userId, token);
            return {
                ...getHumanReadableObject("Rules:1", base64ToBytes(setting.ruleReqDraft), setting.expiry).NewRuleSetting,
                expiry: setting.expiry, id: setting.id, user: user[0].firstName, status: setting.status
            };
        }));
        return NextResponse.json(humanReadableObj);

    } catch (error) {
        console.error("Error fetching rules:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        let body;
        try {
            const text = await req.text();
            body = text ? JSON.parse(text) : null;
        } catch (err) {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        const { id } = body;

        // Verify authorization token
        const cookieStore = cookies();
        const token = (await cookieStore).get("kcToken")?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const user = await verifyTideCloakToken(token, allowedRole);
        if (!user) throw new Error("Invalid token");

        const approvalUri = await createApprovalURI(token);

        const ruleSettings: RuleSettingDraft | null = await GetRuleSettingsDraftById(id);
        if (ruleSettings === null) {
            return NextResponse.json({ error: "No settings draft found with this id" }, { status: 400 });
        }

        return NextResponse.json({ draft: ruleSettings.ruleReqDraft, expiry: ruleSettings.expiry, customDomainUri: approvalUri.customDomainUri });

    } catch (err) {
        console.error("Internal Server Error:", err);
        return NextResponse.json({ error: "Internal Server Error: " + err }, { status: 500 });
    }

}

