import { NextRequest, NextResponse } from "next/server";
import { createApprovalURI, getAdminThreshold, getRealmKeyRules, getTransactionRoles, saveAndSignRules } from "@/lib/tidecloakApi";
import { verifyTideCloakToken } from "@/lib/tideJWT";
import { cookies } from "next/headers";
import { Roles } from "@/app/constants/roles";
import { RoleRepresentation } from "@/lib/keycloakTypes";
import { RuleDefinition, RuleSettings } from "@/interfaces/interface";
import { AddRuleConfiguration, GetRuleSettingsAuthorizationByDraftId, GetRuleSettingsDraftById } from "@/lib/db";

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
            return NextResponse.json({ error: "Invalid token" }, { status: 403 });
        }

        const { id } = await req.json();
        if (!id) {
            return NextResponse.json({ error: "Missing rule ID" }, { status: 400 });
        }

        const ruleDraft = await GetRuleSettingsDraftById(id);
        if (!ruleDraft || !ruleDraft.ruleReqDraft || !ruleDraft.expiry || !ruleDraft.ruleReqDraftJson) {
            return NextResponse.json({ error: "Incomplete or missing rule draft data" }, { status: 400 });
        }

        const ruleAuths = (await GetRuleSettingsAuthorizationByDraftId(ruleDraft.id))
            ?.filter(r => !r.rejected)
            .map(r => r.authorization);

        if (!ruleAuths || ruleAuths.length === 0) {
            return NextResponse.json({ error: "No valid rule authorizations found" }, { status: 400 });
        }

        const res = await saveAndSignRules(
            ruleDraft.ruleReqDraft,
            ruleDraft.expiry,
            ruleAuths,
            token,
            ruleDraft.ruleReqDraftJson
        );

        if (!res) {
            return NextResponse.json({ error: "Failed to save and sign rules" }, { status: 500 });
        }

        await AddRuleConfiguration(ruleDraft.ruleReqDraftJson, res);
        return NextResponse.json({ message: "SUCCESS!!!" });
    } catch (error) {
        console.error("Error saving global rules:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
