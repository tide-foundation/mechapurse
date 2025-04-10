import { NextResponse } from "next/server";
import { getRealmName } from "@/lib/setup/realmStore";
import { getAdminToken } from "@/lib/setup/TidecloakInitRealm";
import path from "path";
import fs from "fs";

const TIDECLOAK_LOCAL_URL = process.env.TIDECLOAK_LOCAL_URL

export async function GET() {
    try {
        const realm = getRealmName();
        const token = await getAdminToken();

        // Load user info — assuming username is always 'admin'
        const res = await fetch(
            `${TIDECLOAK_LOCAL_URL}/admin/realms/${realm}/users?username=admin`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const users = await res.json();
        const user = users[0];

        if (!user) {
            return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
        }

        const attributes = user.attributes || {};
        const linked = attributes["tideLinked"] === "true" || attributes["tideLinked"]?.[0] === "true";

        return NextResponse.json({
            success: linked,
            message: linked ? "User is linked and setup can continue." : "User has not completed linking.",
        });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message || "Unknown error" }, { status: 500 });
    }
}
