import { Roles } from "@/app/constants/roles";
import { Role, User } from "@/interfaces/interface";
import { RoleRepresentation, UserRepresentation } from "@/lib/keycloakTypes";
import { getClientRoleByName, GetUserRoleMappings, GetUsers, GrantUserRole } from "@/lib/tidecloakApi";
import { verifyTideCloakToken } from "@/lib/tideJWT";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const allowedRole = [Roles.Admin];


// Sample Users Database (Replace with actual DB queries)
let users = [
    { id: "1", name: "John Doe", email: "john@example.com", role: "Admin" },
    { id: "2", name: "Jane Smith", email: "jane@example.com", role: "User" },
];

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
            id: u.id ?? "",
            name: u.firstName ?? "",
            email: u.email ?? "",
            role: userClientRoles
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
        const { id, name, email, rolesToAdd, rolesToRemove } = await req.json();

        rolesToAdd.forEach(async (r: string) => {
            await GrantUserRole(id, r, token);
        })
        return NextResponse.json({ message: "Change Request added for this user role assignment." });
    } catch (error) {
        return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
}

// PUT: Update an existing user
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
        const { id, name, email, role } = await req.json();

        role.forEach(async (r: Role) => {
            await GrantUserRole(id, r.name, token);
        })
        return NextResponse.json({ message: "Change Request added for this user role assignment." });
    } catch (error) {
        return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
}

// DELETE: Remove a user
export async function DELETE(req: NextRequest) {
    try {
        const { id } = await req.json();
        users = users.filter(user => user.id !== id);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
}
