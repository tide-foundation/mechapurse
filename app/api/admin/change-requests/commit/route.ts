import { NextRequest, NextResponse } from "next/server";
import { CommtChangeRequest } from "@/lib/tidecloakApi";
import { verifyTideCloakToken } from "@/lib/tideJWT";
import { cookies } from "next/headers";
import { Roles } from "@/app/constants/roles";
import { ChangeRequest } from "@/interfaces/interface";
import { ChangeSetRequest } from "@/lib/keycloakTypes";

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
        const { changeRequest } = await req.json()


        const response = await CommtChangeRequest(changeRequest, token);

        return NextResponse.json({
            message:
                "Successfully commited change request"
        });

    } catch (error) {
        console.error("Error commited change request:", error);
        return NextResponse.json({ error: "Error commited change request:" }, { status: 500 });
    }
}
