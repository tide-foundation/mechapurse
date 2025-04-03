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

        const {ruleDraft, authorizations, expiry, newSetting} = await req.json();

        console.log({ruleDraft, authorizations, expiry})
        
        // get threshold

        // call signRules if meet threshold

        // else just add to db
        // console.log(settings)
        // // Save and sign the rules (rules should be an array of RuleDefinition objects)
        const res = await saveAndSignRules(ruleDraft, expiry, authorizations, token, newSetting);

        await AddRuleConfiguration(newSetting, res)
        
        // await AddRuleConfiguration(JSON.stringify(realmKeysConfig.rules), realmKeysConfig.rulesCert);

        return NextResponse.json({message: "SUCCESS!!!" });
    } catch (error) {
        console.error("Error saving global rules:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
