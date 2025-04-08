import { NextRequest, NextResponse } from "next/server";
import { verifyTideCloakToken } from "@/lib/tideJWT";
import { Roles } from "@/app/constants/roles";
import { getResource } from "@/lib/tidecloakConfig";
import { createAuthorization } from "@/lib/tidecloakApi";
import { cookies } from "next/headers";
import { RuleConfiguration } from "@/interfaces/interface";
import { GetRuleConfiguration } from "@/lib/db";

const allowedRoles = [Roles.User, Roles.Admin];

export async function POST(req: NextRequest) {
    try {
        let body;
        try {
            const text = await req.text();
            body = text ? JSON.parse(text) : null;
        } catch (err) {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        const { authorizerApproval, authorizerAuthentication } = body;

        // Verify authorization token
        const cookieStore = cookies();
        const token = (await cookieStore).get("kcToken")?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const user = await verifyTideCloakToken(token, allowedRoles);
        if (!user) throw new Error("Invalid token");

        const auth = await createAuthorization(getResource(), authorizerApproval, authorizerAuthentication, token);
        const rules: RuleConfiguration | null = await GetRuleConfiguration();
        if (rules == null) {
            return NextResponse.json({ error: "No rules found" }, { status: 404 });
        }
        return NextResponse.json({ authorization: auth, ruleSettings: { ...rules.ruleConfig } });

    } catch (err) {
        console.error("Internal Server Error:", err);
        return NextResponse.json({ error: "Internal Server Error: " + err }, { status: 500 });
    }

}
