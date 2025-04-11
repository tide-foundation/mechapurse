import { NextRequest, NextResponse } from "next/server";
import { verifyTideCloakToken } from "@/lib/tideJWT";
import { Roles } from "@/app/constants/roles";
import { getResource } from "@/lib/tidecloakConfig";
import { createApprovalURI, createAuthorization, getTideRealmAdminInitCert } from "@/lib/tidecloakApi";
import { cookies } from "next/headers";
import { GetRuleConfiguration } from "@/lib/db";
import { RuleConfiguration } from "@/interfaces/interface";
import { SECURITY_ADMIN_CONSOLE } from "@/app/constants/client";

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


        const approvalUri = await createApprovalURI(token);

        return NextResponse.json({ uri: approvalUri.customDomainUri });

    } catch (err) {
        console.error("Internal Server Error:", err);
        return NextResponse.json({ error: "Internal Server Error: " + err }, { status: 500 });
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
        const { authorizerApproval, authorizerAuthentication } = body;

        // Verify authorization token
        const cookieStore = cookies();
        const token = (await cookieStore).get("kcToken")?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const user = await verifyTideCloakToken(token, allowedRoles);
        if (!user) throw new Error("Invalid token");

        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type");

        switch (type) {
            case "cardanoTx":
                const txAuth = await createAuthorization(getResource(), authorizerApproval, authorizerAuthentication, token);
                const rules: RuleConfiguration | null = await GetRuleConfiguration();
                if (rules == null) {
                    return NextResponse.json({ error: "No rules found" }, { status: 404 });
                }
                return NextResponse.json({ authorization: txAuth, ruleSettings: { ...rules.ruleConfig } });
            case "rules":
                const rulesAuth = await createAuthorization(SECURITY_ADMIN_CONSOLE, authorizerApproval, authorizerAuthentication, token);
                const initCert = await getTideRealmAdminInitCert(token);
                return NextResponse.json({ authorization: rulesAuth, initCert: initCert });
        }

    } catch (err) {
        console.error("Internal Server Error:", err);
        return NextResponse.json({ error: "Internal Server Error: " + err }, { status: 500 });
    }

}
