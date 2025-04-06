import { NextRequest, NextResponse } from "next/server";
import { createApprovalURI, getAdminThreshold, getRealmKeyRules, getTransactionRoles, saveAndSignRules } from "@/lib/tidecloakApi";
import { verifyTideCloakToken } from "@/lib/tideJWT";
import { cookies } from "next/headers";
import { Roles } from "@/app/constants/roles";
import { RoleRepresentation } from "@/lib/keycloakTypes";
import { RuleDefinition, RuleSettings } from "@/interfaces/interface";
import { AddRuleConfiguration, GetRuleSettingsAuthorizationById } from "@/lib/db";

const allowedRole = [Roles.Admin];

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
            return NextResponse.json({ error: "Invalid token" }, { status: 403 })
        }

        const { ruleDraft, authorizations, expiry, newSetting } = await req.json();
        const res = await saveAndSignRules(ruleDraft, expiry, authorizations, token, newSetting);

        await AddRuleConfiguration(newSetting, res)
        return NextResponse.json({ message: "SUCCESS!!!" });
    } catch (error) {
        console.error("Error saving global rules:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
