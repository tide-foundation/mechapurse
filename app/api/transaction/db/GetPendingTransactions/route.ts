import { NextRequest, NextResponse } from "next/server";
import { verifyTideCloakToken } from "@/lib/tideJWT";
import { Roles } from "@/app/constants/roles";
import { cookies } from "next/headers";
import { GetAllDraftSignRequests } from "@/lib/db";

const allowedRoles = [Roles.User, Roles.Admin];
const KOIOS_API_URL: string = process.env.KOIOS_API_URL || "https://preprod.koios.rest/api/v1";

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

        const drafts = await GetAllDraftSignRequests();

        return NextResponse.json({ drafts }); // send the drafts in response
    } catch (err) {
        console.error("Internal Server Error:", err);
        return NextResponse.json({ error: "Internal Server Error: " + err }, { status: 500 });
    }
}
