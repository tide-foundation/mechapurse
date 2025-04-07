import { Roles } from "@/app/constants/roles";
import { Role, User } from "@/interfaces/interface";
import { RoleRepresentation, UserRepresentation } from "@/lib/keycloakTypes";
import { AddUser, getClientRoleByName, GetUserRoleMappings, GetUsers, GrantUserRole } from "@/lib/tidecloakApi";
import { verifyTideCloakToken } from "@/lib/tideJWT";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

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
            return NextResponse.json({ error: "Invalid token" }, { status: 403 });
        }

        // Parse query parameters
        const { firstName, email, username, lastName } = await req.json();

        const userRep: UserRepresentation = {
            email: email,
            firstName: firstName,
            lastName: lastName,
            username: username,
            enabled: true
        }
        await AddUser(userRep, token);
        return NextResponse.json({ message: "User has been added" });
    } catch (error) {
        return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
}
