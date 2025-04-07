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
import { AddAuthorization, AddDraftSignRequest } from "@/lib/db";

const allowedRoles = [Roles.User, Roles.Admin];
const KOIOS_API_URL: string = process.env.KOIOS_API_URL || "https://preprod.koios.rest/api/v1";



export async function POST(req: NextRequest) {
    try {
        let body;
        try {
            const text = await req.text();
            body = text ? JSON.parse(text) : null;
        } catch (err) {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const { id, vuid, authorization, rejected } = body;

        // Verify authorization token
        const cookieStore = cookies();
        const token = (await cookieStore).get("kcToken")?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const user = await verifyTideCloakToken(token, allowedRoles);
        if (!user) throw new Error("Invalid token");

        await AddAuthorization(id, vuid, authorization, rejected);

        return NextResponse.json({ message: "Succesfully added admin auth" });
    } catch (err) {
        console.error("Internal Server Error:", err);
        return NextResponse.json({ error: "Internal Server Error: " + err }, { status: 500 });
    }

}
