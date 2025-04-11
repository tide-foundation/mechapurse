import { Roles } from "@/app/constants/roles";
import { Role, User } from "@/interfaces/interface";
import { RoleRepresentation, UserRepresentation } from "@/lib/keycloakTypes";
import { getClientRoleByName, GetTideLinkUrl, GetUserRoleMappings, GetUsers, GrantUserRole } from "@/lib/tidecloakApi";
import { verifyTideCloakToken } from "@/lib/tideJWT";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const allowedRole = [Roles.Admin];

export async function GET(req: NextRequest) {
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

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const redirectUri = searchParams.get("redirect_uri");


    if (userId === null) {
        return NextResponse.json({ error: "No User ID Found" }, { status: 400 });

    }
    if (redirectUri === null) {
        return NextResponse.json({ error: "RedirectUri Found" }, { status: 400 });

    }

    const link = await GetTideLinkUrl(userId, token, redirectUri)

    return NextResponse.json({ link: link });
}


