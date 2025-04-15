import { NextRequest, NextResponse } from "next/server";
import { verifyTideCloakToken } from "@/lib/tideJWT";
import { Roles } from "@/app/constants/roles";
import { getResource } from "@/lib/tidecloakConfig";
import { createAuthorization } from "@/lib/tidecloakApi";
import { cookies } from "next/headers";
import { RuleConfiguration } from "@/interfaces/interface";
import { GetRuleConfiguration } from "@/lib/db";

const allowedRoles = [Roles.User, Roles.Admin];

export async function GET(req: NextRequest) {
    try {
        // Verify authorization token
        const cookieStore = cookies();
        const token = (await cookieStore).get("kcToken")?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const user = await verifyTideCloakToken(token, allowedRoles);
        if (!user) throw new Error("Invalid token");

        const rules: RuleConfiguration | null = await GetRuleConfiguration();
        if (rules == null) {
            return NextResponse.json({ error: "No rules found" }, { status: 404 });
        }
        return NextResponse.json({ ruleSettings: { ...rules.ruleConfig } });

    } catch (err) {
        console.error("Internal Server Error:", err);
        return NextResponse.json({ error: "Internal Server Error: " + err }, { status: 500 });
    }

}
