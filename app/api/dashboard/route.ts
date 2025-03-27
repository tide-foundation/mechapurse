import { Roles } from "@/app/constants/roles";
import { getPublicKey } from "@/lib/tidecloakConfig";
import { verifyTideCloakToken } from "@/lib/tideJWT";
import { base64UrlToBytes } from "@/lib/tideSerialization";
import { Transaction, TxInput, TxOutput } from "@/types/Transactions";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const allowedRole = [Roles.User, Roles.Admin];

const KOIOS_API_URL: string = process.env.KOIOS_API_URL || "https://preprod.koios.rest/api/v1";

export async function GET(req: NextRequest) {
    const { pathname } = req.nextUrl;


    const CardanoWasm = await import("@emurgo/cardano-serialization-lib-browser");

    // Verify authorization token
    const cookieStore = cookies();
    const token = (await cookieStore).get("kcToken")?.value;

    if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await verifyTideCloakToken(token, allowedRole);
    if (!user) throw new Error("Invalid token");

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const walletAddress = searchParams.get("wallet");

    try {
        switch (type) {
            case "wallet":
                console.log("[DEBUG] Generating Enterprise Wallet Address...");
                const publicKey = CardanoWasm.PublicKey.from_bytes(base64UrlToBytes(getPublicKey()));
                const publicKeyHash = publicKey.hash();
                const enterpriseAddress = CardanoWasm.EnterpriseAddress.new(
                    CardanoWasm.NetworkInfo.testnet_preprod().network_id(),
                    CardanoWasm.Credential.from_keyhash(publicKeyHash)
                );
                const enterpriseAddressBech32 = enterpriseAddress.to_address().to_bech32();
                console.log("[DEBUG] Generated Address:", enterpriseAddressBech32);

                console.log(enterpriseAddress.to_address().to_hex().toUpperCase())

                return NextResponse.json({ address: enterpriseAddressBech32 }, { status: 200 });

            case "balance":
                if (!walletAddress) {
                    return NextResponse.json({ error: "Wallet address is required" }, { status: 400 });
                }

                console.log("[DEBUG] Fetching balance for wallet:", walletAddress);
                const balanceResponse = await fetch(`${KOIOS_API_URL}/address_info`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ _addresses: [walletAddress] }),
                });

                const balanceData = await balanceResponse.json();
                if (!balanceData || balanceData.length === 0) {
                    return NextResponse.json({ error: "No balance data found" }, { status: 404 });
                }

                const totalBalanceLovelace = parseInt(balanceData[0].balance, 10);
                const availableBalanceADA = totalBalanceLovelace / 1_000_000; // Convert lovelace to ADA
                console.log("[DEBUG] Balance Retrieved:", availableBalanceADA, "ADA");

                return NextResponse.json({ available_balance: availableBalanceADA.toFixed(6) + " ADA" }, { status: 200 });

            case "transactions":
                if (!walletAddress) {
                    return NextResponse.json({ transactions: [] }, { status: 200 });
                }

                console.log("[DEBUG] Fetching transactions for wallet:", walletAddress);
                const txResponse = await fetch(`${KOIOS_API_URL}/address_txs`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ _addresses: [walletAddress] }),
                });

                const txData = await txResponse.json();
                if (!txData || txData.length === 0) {
                    return NextResponse.json({ transactions: [] }, { status: 200 });
                }

                const transactions: Transaction[] = await Promise.all(
                    txData.map(async (tx: any) => {
                        // Fetch UTXO details for each transaction
                        const utxoResponse = await fetch(`${KOIOS_API_URL}/tx_utxos`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ _tx_hashes: [tx.tx_hash] }),
                        });

                        const utxoData = await utxoResponse.json();
                        if (!utxoData || utxoData.length === 0) return null;

                        const txDetails = utxoData[0];

                        // Extract Inputs (Senders) & Outputs (Receivers)
                        const inputs: TxInput[] = txDetails.inputs.map((input: any) => ({
                            address: input.payment_addr?.bech32 ?? "",
                        }));

                        const outputs: TxOutput[] = txDetails.outputs.map((output: any) => ({
                            address: output.payment_addr?.bech32 ?? "",
                            value: parseInt(output.value ?? "0", 10), // Convert to number & handle NaN
                        }));

                        // ✅ Check if the wallet sent or received the transaction
                        const isSent = inputs.some((input) => input.address === walletAddress);
                        const receivedOutputs: TxOutput[] = outputs.filter((output) => output.address === walletAddress);
                        const isReceived = receivedOutputs.length > 0 && !isSent;

                        let amount = 0;

                        if (isSent) {
                            // Sent Transactions:
                            // - Sent Amount = Sum of outputs NOT returning to the sender (excluding change)
                            const totalSent = outputs.reduce((sum, output) => sum + output.value, 0);
                            const changeAmount = receivedOutputs.reduce((sum, output) => sum + output.value, 0);
                            amount = totalSent - changeAmount;
                        } else if (isReceived) {
                            // Received Transactions:
                            // - Sum all values from `outputs` where `walletAddress` is the receiver.
                            amount = receivedOutputs.reduce((sum, output) => sum + output.value, 0);
                        }

                        return {
                            tx_hash: tx.tx_hash,
                            amount: (amount / 1_000_000).toFixed(6) + " ADA", // Convert from Lovelace to ADA
                            block_time: new Date(tx.tx_timestamp * 1000).toLocaleString(),
                            direction: isSent ? "Sent" : "Received",
                            status: "Success", // Koios does not provide pending info, assuming success
                        };
                    })
                );

                return NextResponse.json({ transactions: transactions.filter(Boolean) }, { status: 200 });

            default:
                return NextResponse.json({ transactions: [] }, { status: 200 });
        }
    } catch (error) {
        console.error("[ERROR] Something went wrong:", error);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}
