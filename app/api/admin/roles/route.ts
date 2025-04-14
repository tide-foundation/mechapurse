import { NextRequest, NextResponse } from "next/server";
import { addAuthorizerInfo, createRoleForClient, createTxMgmtClient, DeleteRole, getClientByClientId, getClientById, getClientRoleByName, getTransactionRoles, markAsAuthorizerRole, UpdateRole } from "@/lib/tidecloakApi";
import { verifyTideCloakToken } from "@/lib/tideJWT";
import { cookies } from "next/headers";
import { Roles } from "@/app/constants/roles";
import { ClientRepresentation, RoleRepresentation } from "@/lib/keycloakTypes";
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

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("all");

    const roles: RoleRepresentation[] = await getTransactionRoles(token);
    console.log(roles)

    const formattedRoles = await Promise.all(
      roles.map(async (r) => {
        const isAuthorizer =
          r.attributes?.["isAuthorizerRole"]?.[0] !== undefined &&
          r.attributes?.["isAuthorizerRole"]?.[0].toLowerCase() === "true";

        const role: Role = {
          id: r.id!,
          name: r.name!,
          description: r.description ?? "",
          isAuthorizer,
          clientRole: false, // default value
        };

        if (r.clientRole) {
          const client: ClientRepresentation | null = await getClientById(r.containerId!, token);
          role.clientRole = true;
          role.clientId = client?.clientId!;
        }

        return role;
      })
    );

    return NextResponse.json({ roles: formattedRoles });
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
      roleInfo.isAuthorizer
    ) {
      const addedRole: RoleRepresentation = await getClientRoleByName(roleInfo.name!, clientId!, token);
      await markAsAuthorizerRole(addedRole.id!, token);
    }
    return NextResponse.json({ success: "Role has been added!" });

  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
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
    await UpdateRole(roleRep, token);

    if (
      roleInfo.isAuthorizer
    ) {
      const addedRole: RoleRepresentation = await getClientRoleByName(roleInfo.name!, clientId!, token);
      await markAsAuthorizerRole(addedRole.id!, token);
    }
    return NextResponse.json({ success: "Role has been added!" });

  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
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
    const roleName = searchParams.get("roleName");
    if ( roleName === null) {
      return NextResponse.json({ error: "RoleName was not provided." }, { status: 400 });
    }
    await DeleteRole(roleName, token);

    return NextResponse.json({ success: "Role has been deleted!" });

  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
