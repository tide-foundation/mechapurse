import { NextRequest, NextResponse } from "next/server";
import { createApprovalURI, getAdminThreshold, getRealmKeyRules, getTransactionRoles, GetUserChangeRequests, saveAndSignRules } from "@/lib/tidecloakApi";
import { verifyTideCloakToken } from "@/lib/tideJWT";
import { cookies } from "next/headers";
import { Roles } from "@/app/constants/roles";
import { RoleRepresentation } from "@/lib/keycloakTypes";
import { RuleDefinition, RuleSettings } from "@/interfaces/interface";
import { AddRuleConfiguration, GetRuleSettingsAuthorizationById, GetRuleSettingsDraft } from "@/lib/db";
import { base64ToBytes, bytesToBase64, getHumanReadableObject } from "tidecloak-js";

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
        const settings = (await GetUserChangeRequests(token));
        if ( settings === null) {
            return NextResponse.json({});
        }
        return NextResponse.json({settings: settings});
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


        return NextResponse.json({ });
    } catch (error) {
        console.error("Error saving global rules:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
