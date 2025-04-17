import { Roles } from "@/app/constants/roles";
import { Role, User } from "@/interfaces/interface";
import { AddUserIdentity } from "@/lib/db";
import { RoleRepresentation, UserRepresentation } from "@/lib/keycloakTypes";
import { DeleteUser, getClientRoleByName, getUserByVuid, GetUserRoleMappings, GetUsers, GrantUserRole, RemoveUserRole, UpdateUser } from "@/lib/tidecloakApi";
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

    const allUsers = await GetUsers(token);

    const users: User[] = await Promise.all(allUsers.map(async (u) => {
        const userRoles = await GetUserRoleMappings(u.id!, token);
        const userClientRoles = userRoles.clientMappings
            ? Object.values(userRoles.clientMappings).flatMap(m => m.mappings?.map(role => role.name!) || [])
            : [];

        return {
            ...u,
            id: u.id ?? "",
            firstName: u.firstName ?? "",
            lastName: u.lastName ?? "",
            email: u.email ?? "",
            role: userClientRoles,

        }
    }));
    return NextResponse.json(users);
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

        // Parse query parameters
        const { id, username, rolesToAdd, rolesToRemove, vuid } = await req.json();


        rolesToAdd.forEach(async (r: string) => {
            await GrantUserRole(id, r, token);
        })
        rolesToRemove.forEach(async (r: string) => {
            await RemoveUserRole(id, r, token);
        })

        AddUserIdentity(vuid, username);

        return NextResponse.json({ message: "Change Request added for this user role update." });
    } catch (error) {
        return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
}

export async function PUT(req: NextRequest) {
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
        const { id, firstName, lastName, email  } = await req.json();

        await UpdateUser(id, firstName, lastName, email, token)
        return NextResponse.json({ message: "Change Request added for this user role update." });
    } catch (error) {
        return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
}

export async function DELETE(req: NextRequest) {
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
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");

        if(userId === null) {
            return NextResponse.json({ error: "UserId was not provided" }, { status: 400 });
        }

        await DeleteUser(userId, token)

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
}
