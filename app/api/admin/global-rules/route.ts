import { NextRequest, NextResponse } from "next/server";
import { getRealmKeyRules, getTransactionRoles, saveAndSignRules } from "@/lib/tidecloakApi";
import { verifyTideCloakToken } from "@/lib/tideJWT";
import { cookies } from "next/headers";
import { Roles } from "@/app/constants/roles";
import { RoleRepresentation } from "@/lib/keycloakTypes";
import { RuleDefinition, RulesContainer } from "@/interfaces/interface";
import { AddRuleConfiguration } from "@/lib/db";

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

        // Get the rules container that matches your RulesContainer interface.
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

        // Parse the request body and extract rules
        const settings = await req.json();

        console.log(settings)
        // Save and sign the rules (rules should be an array of RuleDefinition objects)
        await saveAndSignRules(settings, token);

        const realmKeysConfig = await getRealmKeyRules(token);
        await AddRuleConfiguration(JSON.stringify(realmKeysConfig.rules), realmKeysConfig.rulesCert);

        return NextResponse.json({ roles: "updated" });
    } catch (error) {
        console.error("Error saving global rules:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
