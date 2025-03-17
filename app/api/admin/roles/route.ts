import { NextRequest, NextResponse } from "next/server";
import { addAuthorizerInfo, createRoleForClient, createTxMgmtClient, getClientByClientId, getClientRoleByName, getTransactionRoles } from "@/lib/tidecloakApi";
import { verifyTideCloakToken } from "@/lib/tideJWT";
import { cookies } from "next/headers";
import { Roles } from "@/app/constants/roles";
import { RoleRepresentation } from "@/lib/keycloakTypes";
import { TX_MANAGEMENT_CLIENT } from "@/app/constants/client";
import { AuthorizerInfoRequest, Role } from "@/interfaces/interface";

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

        const roles: RoleRepresentation[] = await getTransactionRoles(token);
        return NextResponse.json({ roles });

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

        const client = await getClientByClientId(TX_MANAGEMENT_CLIENT, token);
        if (client === null) {
            await createTxMgmtClient(token)
        }
        const clientId = (await getClientByClientId(TX_MANAGEMENT_CLIENT, token))?.id;


        const roleInfo: Partial<Role> = await req.json();
        const roleRep: RoleRepresentation = {
            name: roleInfo.name,
            description: roleInfo.description


        }

        await createRoleForClient(clientId!, roleRep, token);

        if (
            roleInfo.authorizerType?.trim() &&
            roleInfo.signModels && roleInfo.signModels.length > 0 &&
            roleInfo.threshold?.trim()
        ) {
            const authInfo: AuthorizerInfoRequest = {
                signModels: roleInfo.signModels,
                authorizerType: roleInfo.authorizerType,
                threshold: roleInfo.threshold
            };
            const addedRole: RoleRepresentation = await getClientRoleByName(roleInfo.name!, clientId!, token);
            await addAuthorizerInfo(addedRole.id!, authInfo, token);
        }
        return NextResponse.json({ success: "Role has been added!" });

    } catch (error) {
        console.error("Error fetching roles:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

