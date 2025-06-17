import type { NextApiRequest, NextApiResponse } from "next";
import { verifyTideCloakToken } from "@/lib/tideJWT";
import { Roles } from "@/app/constants/roles";
import { base64UrlToBytes, base64ToBytes } from "@/lib/tideSerialization";
import { getPublicKey } from "@/lib/tidecloakConfig";
import { loadCardanoWasm } from "@/config/cardanoWasmConfig";
import { parseCookies } from "@/lib/utils";

const allowedRoles = [Roles.User, Roles.Admin];
const KOIOS_API_URL = process.env.KOIOS_API_URL ?? "https://preprod.koios.rest/api/v1";

async function submitSignedTransaction(transactionBytes: Uint8Array): Promise<string> {
  const headers = {
    "Content-Type": "application/cbor",
    ...(process.env.KOIOS_JWT && {
      Authorization: `Bearer ${process.env.KOIOS_JWT}`,
    }),
  };

  const response = await fetch(`${KOIOS_API_URL}/submittx`, {
    method: "POST",
    headers,
    body: transactionBytes,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Koios submit error:", {
      status: response.status,
      body: errorBody,
    });
    throw new Error(`Failed to submit transaction: ${errorBody}`);
  }

  const txHash = await response.text();
  return txHash;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const CardanoWasm = await loadCardanoWasm();

    let body;
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } catch {
      return res.status(400).json({ error: "Invalid JSON body" });
    }

    const { txBody, sigBase64 } = body || {};
    if (!txBody || !sigBase64) {
      return res.status(400).json({ error: "Missing transaction data" });
    }

    // 🍪 Manually parse cookies
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies.kcToken;

    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const user = await verifyTideCloakToken(token, allowedRoles);
    if (!user) return res.status(401).json({ error: "Invalid token" });

    const publicKey = CardanoWasm.PublicKey.from_bytes(base64UrlToBytes(getPublicKey()));
    const vkeyWitnesses = CardanoWasm.Vkeywitnesses.new();
    const vKey = CardanoWasm.Vkey.new(publicKey);
    const sig = CardanoWasm.Ed25519Signature.from_bytes(base64ToBytes(sigBase64));
    const vkeyWitness = CardanoWasm.Vkeywitness.new(vKey, sig);

    vkeyWitnesses.add(vkeyWitness);

    const witnesses = CardanoWasm.TransactionWitnessSet.new();
    witnesses.set_vkeys(vkeyWitnesses);

    const txBodyBytes = CardanoWasm.TransactionBody.from_bytes(base64ToBytes(txBody));
    const transaction = CardanoWasm.Transaction.new(txBodyBytes, witnesses, undefined);

    const result = await submitSignedTransaction(transaction.to_bytes());

    return res.status(200).json({ txHash: result });

  } catch (err) {
    console.error("[API ERROR]:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
