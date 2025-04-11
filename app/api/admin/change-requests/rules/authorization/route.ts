import { NextRequest, NextResponse } from "next/server";
import { createApprovalURI, getAdminThreshold, getRealmKeyRules, getTransactionRoles, saveAndSignRules } from "@/lib/tidecloakApi";
import { verifyTideCloakToken } from "@/lib/tideJWT";
import { cookies } from "next/headers";
import { Roles } from "@/app/constants/roles";
import { RoleRepresentation } from "@/lib/keycloakTypes";
import { RuleDefinition, RuleSettingAuthorization, RuleSettingDraft, RuleSettings } from "@/interfaces/interface";
import { AddRuleSettingsAuthorization, AddRuleConfiguration, GetRuleSettingsAuthorizationByDraftId, GetRuleSettingsDraft, UpdateRuleSettingDraftStatusById } from "@/lib/db";
import { base64ToBytes, bytesToBase64, getHumanReadableObject } from "tidecloak-js";

const allowedRole = [Roles.Admin];

export async function GET(req: NextRequest) {
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
        if (!user) {
            return NextResponse.json({ error: "Invalid token" }, { status: 403 });
        }

        const ruleAuth: RuleSettingAuthorization[] | null = await GetRuleSettingsAuthorizationByDraftId(id)

        return NextResponse.json({ authorization: ruleAuth });
    } catch (error) {
        console.error("Error fetching roles:", error);
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

        const { ruleReqDraftId, vuid, authorizations: authorization, rejected } = body;

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

        await AddRuleSettingsAuthorization(ruleReqDraftId, vuid, authorization, rejected);

        const authorizations: RuleSettingAuthorization[] | null = await GetRuleSettingsAuthorizationByDraftId(ruleReqDraftId);

        const estimateTotalAdmins = (threshold: number, thresholdPercentage: number): number => {
            return Math.ceil(threshold / thresholdPercentage);
        };

        if (authorizations) {
            const totalApprovals = authorizations.filter(auth => !auth.rejected).length;
            const totalRejected = authorizations.filter(auth => auth.rejected).length;
            const threshold = Number(await getAdminThreshold(token));

            if (!isNaN(threshold)) {
                const estimatedTotalAdmins = estimateTotalAdmins(threshold, 0.7);
                const votesReceived = totalApprovals + totalRejected;
                const potentialRemainingApprovals = estimatedTotalAdmins - votesReceived;
                const bestCaseApprovals = totalApprovals + potentialRemainingApprovals;

                // Auto-reject if even if all remaining admins approve you still won't hit the threshold.
                if (bestCaseApprovals < threshold) {

                    await UpdateRuleSettingDraftStatusById(ruleReqDraftId, "DENIED");
                }
                // Approve if enough approvals have been collected.
                else if (totalApprovals >= threshold) {
                    await UpdateRuleSettingDraftStatusById(ruleReqDraftId, "APPROVED");
                }
                else {
                    await UpdateRuleSettingDraftStatusById(ruleReqDraftId, "PENDING");
                }
            }
        }

        return NextResponse.json({ message: "Succesfully added auth" });
    } catch (error) {
        console.error("Error saving global rules:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
