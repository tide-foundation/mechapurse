import type { NextApiRequest, NextApiResponse } from "next";
import { Roles } from "@/app/constants/roles";
import { getPublicKey } from "@/lib/tidecloakConfig";
import { verifyTideCloakToken } from "@/lib/tideJWT";
import { base64UrlToBytes } from "@/lib/tideSerialization";
import { Transaction, TxInput, TxOutput } from "@/types/Transactions";
import { loadCardanoWasm } from "@/config/cardanoWasmConfig";
import { parseCookies } from "@/lib/utils";

const allowedRole = [Roles.User, Roles.Admin];
const KOIOS_API_URL = process.env.KOIOS_API_URL || "https://preprod.koios.rest/api/v1";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const CardanoWasm = await loadCardanoWasm();

  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.kcToken;

  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const user = await verifyTideCloakToken(token, allowedRole);
  if (!user) return res.status(401).json({ error: "Invalid token" });

  const type = req.query.type as string;
  const walletAddress = req.query.wallet as string;

  try {
    switch (type) {
      case "wallet": {
        const publicKey = CardanoWasm.PublicKey.from_bytes(base64UrlToBytes(getPublicKey()));
        const publicKeyHash = publicKey.hash();
        const enterpriseAddress = CardanoWasm.EnterpriseAddress.new(
          CardanoWasm.NetworkInfo.testnet_preprod().network_id(),
          CardanoWasm.Credential.from_keyhash(publicKeyHash)
        );
        const bech32 = enterpriseAddress.to_address().to_bech32();
        const hex = enterpriseAddress.to_address().to_hex().toUpperCase();

        return res.status(200).json({ address: bech32, addressHex: hex });
      }

      case "balance": {
        if (!walletAddress) return res.status(400).json({ error: "Wallet address is required" });

        const balanceResponse = await fetch(`${KOIOS_API_URL}/address_info`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ _addresses: [walletAddress] }),
        });

        const balanceData = await balanceResponse.json();
        if (!balanceData || balanceData.length === 0) {
          return res.status(404).json({ error: "No balance data found" });
        }

        const lovelace = parseInt(balanceData[0].balance, 10);
        const ada = lovelace / 1_000_000;

        return res.status(200).json({ available_balance: ada.toFixed(6) + " ADA" });
      }

      case "transactions": {
        if (!walletAddress) return res.status(200).json({ transactions: [] });

        const txResponse = await fetch(`${KOIOS_API_URL}/address_txs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ _addresses: [walletAddress] }),
        });

        const txData = await txResponse.json();
        if (!txData || txData.length === 0) {
          return res.status(200).json({ transactions: [] });
        }

        const transactions: Transaction[] = await Promise.all(
          txData.map(async (tx: any) => {
            const utxoResponse = await fetch(`${KOIOS_API_URL}/tx_utxos`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ _tx_hashes: [tx.tx_hash] }),
            });

            const utxoData = await utxoResponse.json();
            if (!utxoData || utxoData.length === 0) return null;

            const txDetails = utxoData[0];

            const inputs: TxInput[] = txDetails.inputs.map((input: any) => ({
              address: input.payment_addr?.bech32 ?? "",
            }));

            const outputs: TxOutput[] = txDetails.outputs.map((output: any) => ({
              address: output.payment_addr?.bech32 ?? "",
              value: parseInt(output.value ?? "0", 10),
            }));

            const isSent = inputs.some((i) => i.address === walletAddress);
            const receivedOutputs = outputs.filter((o) => o.address === walletAddress);
            const isReceived = receivedOutputs.length > 0 && !isSent;

            let amount = 0;
            if (isSent) {
              const totalSent = outputs.reduce((sum, o) => sum + o.value, 0);
              const changeAmount = receivedOutputs.reduce((sum, o) => sum + o.value, 0);
              amount = totalSent - changeAmount;
            } else if (isReceived) {
              amount = receivedOutputs.reduce((sum, o) => sum + o.value, 0);
            }

            return {
              tx_hash: tx.tx_hash,
              amount: (amount / 1_000_000).toFixed(6) + " ADA",
              block_time: new Date(tx.tx_timestamp * 1000).toLocaleString(),
              direction: isSent ? "Sent" : "Received",
              status: "Success",
            };
          })
        );

        return res.status(200).json({ transactions: transactions.filter(Boolean) });
      }

      default:
        return res.status(400).json({ error: "Invalid request type" });
    }
  } catch (err) {
    console.error("[ERROR]", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}
