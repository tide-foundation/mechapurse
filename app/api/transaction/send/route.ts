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

const allowedRoles = [Roles.User, Roles.Admin];
const KOIOS_API_URL: string = process.env.KOIOS_API_URL || "https://preprod.koios.rest/api/v1";


// Fetches the current block height to use for TTL calculations
async function getCurrentSlotNumber(CardanoWasm: any): Promise<BigNum> {
    const response = await fetch(`${KOIOS_API_URL}/tip`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch current slot: ${response.statusText}`);
    }

    const data: any = await response.json();
    if (!data || !data[0] || !data[0].abs_slot) {
        throw new Error("Invalid response from Koios for slot number.");
    }

    // Convert the slot number to BigNum
    return CardanoWasm.BigNum.from_str(data[0].abs_slot.toString());
}


// Fetches all UTXOs for a given address and constructs TransactionUnspentOutputs
async function getTxUnspentOutputs(CardanoWasm: any, address: string): Promise<any> {
    const response = await fetch(`${KOIOS_API_URL}/address_info`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ _addresses: [address] })
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch UTXOs: ${response.statusText}`);
    }

    const data: any[] = await response.json();
    if (!data || !data.length || !data[0].utxo_set) {
        throw new Error("No UTXOs found for the address.");
    }

    const utxos: any[] = data[0].utxo_set;
    const txOutputs = CardanoWasm.TransactionUnspentOutputs.new();

    utxos.forEach((utxo: any) => {
        const input = CardanoWasm.TransactionInput.new(
            CardanoWasm.TransactionHash.from_bytes(Buffer.from(utxo.tx_hash, "hex")),
            parseInt(utxo.tx_index, 10)
        );

        const value = CardanoWasm.Value.new(
            CardanoWasm.BigNum.from_str(utxo.value)
        );

        const utxoAddress = CardanoWasm.Address.from_bech32(address);
        const output = CardanoWasm.TransactionOutput.new(utxoAddress, value);

        const transactionUnspentOutput = CardanoWasm.TransactionUnspentOutput.new(input, output);
        txOutputs.add(transactionUnspentOutput);
    });

    return txOutputs;
}

async function submitSignedTransaction(transactionBytes: Uint8Array): Promise<string> {
    try {
        const response = await fetch(`${KOIOS_API_URL}/submittx`, {
            method: "POST",
            headers: {
                "Content-Type": "application/cbor"
            },
            body: transactionBytes
        });

        if (!response.ok) {
            // 🔹 Log full response details
            const errorBody = await response.text();
            console.error(`Error Response from Koios:`, {
                status: response.status,
                statusText: response.statusText,
                body: errorBody
            });
            throw new Error(`Failed to submit transaction: ${response.statusText} - ${errorBody}`);
        }

        const txHash = await response.text();
        console.log("Transaction Submitted! TX Hash:", txHash);
        return txHash;
    } catch (error) {
        console.error("Error submitting transaction:", error);
        throw error;
    }
}


export async function POST(req: NextRequest) {
    try {
        const CardanoWasm = await import("@emurgo/cardano-serialization-lib-browser");

        let body;
        try {
            const text = await req.text();
            body = text ? JSON.parse(text) : null;
        } catch (err) {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const { txBody, sigBase64 } = body;

        // Verify authorization token
        const cookieStore = cookies();
        const token = (await cookieStore).get("kcToken")?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const user = await verifyTideCloakToken(token, allowedRoles);
        if (!user) throw new Error("Invalid token");

        const publicKey = CardanoWasm.PublicKey.from_bytes(base64UrlToBytes(getPublicKey()));

        // const test = await signTx(txBase64, "3b51f0fe-6feb-4129-af4c-6271a037a2f0", token);

        // const txBodyBytes = Buffer.from(txBody, 'hex');
        // const txHash = FixedTransaction.new_from_body_bytes(txBodyBytes);
        // add keyhash witnesses
        const vkeyWitnesses = CardanoWasm.Vkeywitnesses.new();
        const vKey = Vkey.new(publicKey);

        const sig = Ed25519Signature.from_bytes(base64ToBytes(sigBase64));
        const vkeyWitness = CardanoWasm.Vkeywitness.new(vKey, sig);
        vkeyWitnesses.add(vkeyWitness);

        const witnesses = CardanoWasm.TransactionWitnessSet.new();
        witnesses.set_vkeys(vkeyWitnesses);

    
        const test = TransactionBody.from_bytes(base64ToBytes(txBody));


        // create the finalized transaction with witnesses
        const transaction = CardanoWasm.Transaction.new(
            test,
            witnesses,
            undefined, // transaction metadata
        );

        // console.log({ transaction: txBody.to_hex(), hash: txHash.transaction_hash().to_hex() })

        // const approvalUri = await createApprovalURI(token);

        const result = await submitSignedTransaction(transaction.to_bytes());


        // return NextResponse.json({ txHash: result });
        return NextResponse.json({ txHash: result });
    } catch (err) {
        console.error("Internal Server Error:", err);
        return NextResponse.json({ error: "Internal Server Error: " + err }, { status: 500 });
    }

}
