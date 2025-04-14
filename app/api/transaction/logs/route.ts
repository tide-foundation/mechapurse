import { NextRequest, NextResponse } from "next/server";
import { verifyTideCloakToken } from "@/lib/tideJWT";
import { Roles } from "@/app/constants/roles";
import { cookies } from "next/headers";
import { GetDraftSignRequestAuthorizations } from "@/lib/db";
import { AdminAuthorizationPack } from "@/interfaces/interface";
import { GetUserName } from "@/app/utils/helperMethods";

const allowedRoles = [Roles.User, Roles.Admin];

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

        const user = await verifyTideCloakToken(token, allowedRoles);
        if (!user) throw new Error("Invalid token");

        const authPacks: AdminAuthorizationPack[] = await GetDraftSignRequestAuthorizations(id);

    

        return NextResponse.json({ authPacks }); // send the drafts in response
    } catch (err) {
        console.error("Internal Server Error:", err);
        return NextResponse.json({ error: "Internal Server Error: " + err }, { status: 500 });
    }
}
