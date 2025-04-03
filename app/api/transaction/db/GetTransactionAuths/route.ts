import { NextRequest, NextResponse } from "next/server";
import { createTransactionBuilder } from "@/lib/transactionBuilderConfig";
import { verifyTideCloakToken } from "@/lib/tideJWT";
import { Roles } from "@/app/constants/roles";
import { base64UrlToBytes } from "@/lib/tideSerialization";
import { getPublicKey } from "@/lib/tidecloakConfig";
import { BigNum, Ed25519Signature, FixedTransaction, TransactionBody, Vkey } from "@emurgo/cardano-serialization-lib-browser";
import { base64ToBytes, bytesToBase64 } from "tidecloak-js";
import { createApprovalURI, signTx } from "@/lib/tidecloakApi";
import { cookies } from "next/headers";
import { routeRoleMapping } from "@/lib/authConfig";
import { AddAuthorization, AddDraftSignRequest, GetAllDraftSignRequests, GetDraftSignRequest, GetDraftSignRequestAuthorizations } from "@/lib/db";
import { AdminAuthorizationPack } from "@/interfaces/interface";

const allowedRoles = [Roles.User, Roles.Admin];

export async function POST(req: NextRequest) {
    try {
        let body;
        try {
            const text = await req.text();
            body = text ? JSON.parse(text) : null;
        } catch (err) {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const { id } = body;
        // Verify authorization token
        const cookieStore = cookies();
        const token = (await cookieStore).get("kcToken")?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await verifyTideCloakToken(token, allowedRoles);
        if (!user) throw new Error("Invalid token");

        const authPacks: AdminAuthorizationPack[] = await GetDraftSignRequestAuthorizations(id);

        return NextResponse.json({ authPacks }); // send the drafts in response
    } catch (err) {
        console.error("Internal Server Error:", err);
        return NextResponse.json({ error: "Internal Server Error: " + err }, { status: 500 });
    }
}
