import { NextRequest, NextResponse } from "next/server";
import { createTransactionBuilder } from "@/lib/transactionBuilderConfig";
import { verifyTideCloakToken } from "@/lib/tideJWT";
import { Roles } from "@/app/constants/roles";
import { base64UrlToBytes } from "@/lib/tideSerialization";
import { getPublicKey } from "@/lib/tidecloakConfig";
import { BigNum, Ed25519Signature, FixedTransaction, Vkey } from "@emurgo/cardano-serialization-lib-browser";
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

        if (!body || !body.recipient || !body.amount) {
            return NextResponse.json({ error: "Missing recipient or amount" }, { status: 400 });
        }

        const { recipient, amount } = body;
        const amountToSend = Number(amount);
        if (isNaN(amountToSend) || amountToSend <= 0) {
            return NextResponse.json({ error: "Invalid amount provided." }, { status: 400 });
        }

        try {
            CardanoWasm.Address.from_bech32(recipient); // Validate recipient address format
        } catch (err) {
            return NextResponse.json({ error: "Invalid recipient address format." }, { status: 400 });
        }

        // Verify authorization token
        const cookieStore = cookies();
        const token = (await cookieStore).get("kcToken")?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const user = await verifyTideCloakToken(token, allowedRoles);
        if (!user) throw new Error("Invalid token");

        // Generate sender address from public key
        const publicKey = CardanoWasm.PublicKey.from_bytes(base64UrlToBytes(getPublicKey()));
        const publicKeyHash = publicKey.hash();
        const enterpriseAddress = CardanoWasm.EnterpriseAddress.new(
            CardanoWasm.NetworkInfo.testnet_preprod().network_id(),
            CardanoWasm.Credential.from_keyhash(publicKeyHash)
        );
        const enterpriseAddressBech32 = enterpriseAddress.to_address().to_bech32();

        console.log("Sender Enterprise Address:", enterpriseAddressBech32);

        const txUnspentOutputs = await getTxUnspentOutputs(CardanoWasm, enterpriseAddressBech32);
        const txBuilder = await createTransactionBuilder();

        // Add transaction outputs first
        txBuilder.add_output(
            CardanoWasm.TransactionOutput.new(
                CardanoWasm.Address.from_bech32(recipient),
                CardanoWasm.Value.new(CardanoWasm.BigNum.from_str((amountToSend * 1_000_000).toString()))
            )
        );

        // Now, add inputs after setting outputs
        txBuilder.add_inputs_from(txUnspentOutputs, 1);

        // Calculate and set transaction fee
        const minFee = txBuilder.min_fee();
        const adjustedFee = minFee.checked_add(CardanoWasm.BigNum.from_str("2000"));
        txBuilder.set_fee(adjustedFee);


        // Ensure enough input is selected to cover outputs and fees
        txBuilder.add_change_if_needed(enterpriseAddress.to_address());

        console.log("Change Address:", enterpriseAddress.to_address().to_bech32());


        // 1 slot = 1 second
        const currentSlot = await getCurrentSlotNumber(CardanoWasm);
        const slotBuffer = CardanoWasm.BigNum.from_str("7200"); // 1-hour slot buffer
        const ttl = currentSlot.checked_add(slotBuffer); // Correct BigNum addition
        txBuilder.set_ttl_bignum(ttl);

        // Build transaction and return hex
        const txBody = txBuilder.build()
        console.log(txBody.to_json())
        const txBase64 = bytesToBase64(txBody.to_bytes());

        const approvalUri = await createApprovalURI(token);

        return NextResponse.json({ data: txBase64, uri: approvalUri.customDomainUri, txBody: txBody.to_json() });

    } catch (err) {
        console.error("Internal Server Error:", err);
        return NextResponse.json({ error: "Internal Server Error: " + err }, { status: 500 });
    }

}
