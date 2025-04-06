import { NextRequest, NextResponse } from "next/server";
import { getClientById, getTideRealmAdminRole, getTransactionRoles } from "@/lib/tidecloakApi";
import { verifyTideCloakToken } from "@/lib/tideJWT";
import { cookies } from "next/headers";
import { Roles } from "@/app/constants/roles";
import { ClientRepresentation, RoleRepresentation } from "@/lib/keycloakTypes";
import { Role } from "@/interfaces/interface";

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
    const tideRealmAdmin: RoleRepresentation = await getTideRealmAdminRole(token);
    roles.push(tideRealmAdmin);

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



