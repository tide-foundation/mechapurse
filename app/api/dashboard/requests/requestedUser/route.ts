import { NextRequest, NextResponse } from "next/server";
import { verifyTideCloakToken } from "@/lib/tideJWT";
import { Roles } from "@/app/constants/roles";
import { cookies } from "next/headers";
import { GetUsernameForUserId } from "@/lib/db";

const allowedRoles = [Roles.User, Roles.Admin];

export async function GET(req: NextRequest) {
    try {

        const cookieStore = cookies();
        const token = (await cookieStore).get("kcToken")?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await verifyTideCloakToken(token, allowedRoles);
        if (!user) throw new Error("Invalid token");


        // Check for vuid in query param
        const { searchParams } = new URL(req.url);
        const vuid = searchParams.get("userId");
        if (vuid === null) {
            return NextResponse.json({ error: "Missing userId" }, { status: 400 });
        }

        const username = GetUsernameForUserId(vuid);
        return NextResponse.json({ username: username });

    } catch (err) {
        console.error("Internal Server Error:", err);
        return NextResponse.json({ error: "Internal Server Error: " + err }, { status: 500 });
    }
}
