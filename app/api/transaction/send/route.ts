import { NextRequest, NextResponse } from "next/server";
import { createTransactionBuilder } from "@/lib/transactionBuilderConfig";
import { verifyTideCloakToken } from "@/lib/tideJWT";
import { Roles } from "@/app/constants/roles";
import { base64UrlToBytes } from "@/lib/tideSerialization";
import { getPublicKey } from "@/lib/tidecloakConfig";

const allowedRole = Roles.User;
const BLOCKFROST_API_KEY = process.env.BLOCKFROST_API_KEY!;
const NETWORK = process.env.BLOCKFROST_ENV!; // "preprod" or "mainnet"

async function getTxUnspentOutputs(address: string, CardanoWasm: any) {
    // Fetch UTXOs from the Blockfrost API for the given Cardano address
    const response = await fetch(`https://cardano-${NETWORK}.blockfrost.io/api/v0/addresses/${address}/utxos`, {
        headers: { "project_id": BLOCKFROST_API_KEY },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch UTXOs: ${response.statusText}`);
    }

    const utxos = await response.json();

    // Create a new empty TransactionUnspentOutputs collection
    const txOutputs = CardanoWasm.TransactionUnspentOutputs.new();

    // Loop through each UTXO to convert it into CardanoWasm format
    utxos.forEach((utxo: any) => {

        const input = CardanoWasm.TransactionInput.new(
            CardanoWasm.TransactionHash.from_bytes(Buffer.from(utxo.tx_hash, "hex")),
            utxo.tx_index
        );

        const value = CardanoWasm.Value.new(
            CardanoWasm.BigNum.from_str(utxo.amount.find((a: any) => a.unit === "lovelace").quantity)
        );

        const output = CardanoWasm.TransactionOutput.new(
            CardanoWasm.Address.from_bech32(address),
            value
        );

        // Combine the input and output into a single unspent transaction output
        const transactionUnspentOutput = CardanoWasm.TransactionUnspentOutput.new(input, output);

        // Add the UTXO to the collection
        txOutputs.add(transactionUnspentOutput);
    });

    // Return the formatted UTXO collection
    return txOutputs;
}


export async function POST(req: NextRequest) {
    try {
        const CardanoWasm = await import("@emurgo/cardano-serialization-lib-browser"); // need to dyanmically import it

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
            CardanoWasm.Address.from_bech32(recipient);
        } catch (err) {
            return NextResponse.json({ error: "Invalid recipient address format." }, { status: 400 });
        }

        const authHeader = req.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split(" ")[1];
        const user = await verifyTideCloakToken(token, allowedRole);
        if (!user) {
            return NextResponse.json({ error: "Invalid token" }, { status: 403 });
        }

        // Get public get from config and derive Wallet address from it
        const publicKey = CardanoWasm.PublicKey.from_bytes(base64UrlToBytes(getPublicKey()));
        const publicKeyHash = publicKey.hash();
        const enterpriseAddress = CardanoWasm.EnterpriseAddress.new(
            CardanoWasm.NetworkInfo.testnet_preprod().network_id(),
            CardanoWasm.Credential.from_keyhash(publicKeyHash)
        );
        const enterpriseAddressBech32 = enterpriseAddress.to_address().to_bech32();

        console.log("Sender Enterprise Address:", enterpriseAddressBech32);

        const txUnspentOutputs = await getTxUnspentOutputs(enterpriseAddressBech32, CardanoWasm);

        const txBuilder = await createTransactionBuilder();

        txBuilder.add_inputs_from(txUnspentOutputs, 1);

        txBuilder.add_output(
            CardanoWasm.TransactionOutput.new(
                CardanoWasm.Address.from_bech32(recipient),
                CardanoWasm.Value.new(CardanoWasm.BigNum.from_str((amountToSend * 1_000_000).toString()))
            )
        );

        const minFee = txBuilder.min_fee();
        txBuilder.set_fee(minFee);

        txBuilder.add_change_if_needed(enterpriseAddress.to_address());


        const transactionHex = txBuilder.build().to_hex();

        return NextResponse.json({ transaction: transactionHex });
    } catch (err) {
        console.error("❌ Internal Server Error:", err);
        return NextResponse.json({ error: "Internal Server Error: " + err }, { status: 500 });
    }
}
