import type { NextApiRequest, NextApiResponse } from "next";
import { createTransactionBuilder } from "@/lib/transactionBuilderConfig";
import { verifyTideCloakToken } from "@/lib/tideJWT";
import { Roles } from "@/app/constants/roles";
import { base64UrlToBytes, bytesToBase64 } from "@/lib/tideSerialization";
import { getPublicKey } from "@/lib/tidecloakConfig";
import { createApprovalURI } from "@/lib/tidecloakApi";
import { loadCardanoWasm } from "@/config/cardanoWasmConfig";
import { parseCookies } from "@/lib/utils";
import { AddUserIdentity } from "@/lib/db";

const allowedRoles = [Roles.User, Roles.Admin];
const KOIOS_API_URL = process.env.KOIOS_API_URL || "https://preprod.koios.rest/api/v1";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const CardanoWasm = await loadCardanoWasm();

    let body;
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } catch (err) {
      return res.status(400).json({ error: "Invalid JSON body" });
    }

    const { recipient, amount } = body || {};
    const amountToSend = Number(amount);

    if (!recipient || isNaN(amountToSend) || amountToSend <= 0) {
      return res.status(400).json({ error: "Missing or invalid recipient or amount" });
    }

    try {
      CardanoWasm.Address.from_bech32(recipient);
    } catch (err) {
      return res.status(400).json({ error: "Invalid recipient address format." });
    }

    // ✅ Manually parse cookies
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies.kcToken;

    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const user = await verifyTideCloakToken(token, allowedRoles);
    if (!user) return res.status(401).json({ error: "Invalid token" });
    AddUserIdentity(user.vuid!, user.preferred_username!);


    // Construct sender address
    const publicKey = CardanoWasm.PublicKey.from_bytes(base64UrlToBytes(getPublicKey()));
    const publicKeyHash = publicKey.hash();
    const enterpriseAddress = CardanoWasm.EnterpriseAddress.new(
      CardanoWasm.NetworkInfo.testnet_preprod().network_id(),
      CardanoWasm.Credential.from_keyhash(publicKeyHash)
    );
    const senderAddress = enterpriseAddress.to_address().to_bech32();

    const txUnspentOutputs = await getTxUnspentOutputs(CardanoWasm, senderAddress);
    const txBuilder = await createTransactionBuilder();

    txBuilder.add_output(
      CardanoWasm.TransactionOutput.new(
        CardanoWasm.Address.from_bech32(recipient),
        CardanoWasm.Value.new(CardanoWasm.BigNum.from_str((amountToSend * 1_000_000).toString()))
      )
    );

    txBuilder.add_inputs_from(txUnspentOutputs, 1);

    const minFee = txBuilder.min_fee();
    const adjustedFee = minFee.checked_add(CardanoWasm.BigNum.from_str("2000"));
    txBuilder.set_fee(adjustedFee);
    txBuilder.add_change_if_needed(enterpriseAddress.to_address());

    const currentSlot = await getCurrentSlotNumber(CardanoWasm);
    const ttl = currentSlot.checked_add(CardanoWasm.BigNum.from_str("7200"));
    txBuilder.set_ttl_bignum(ttl);

    const txBody = txBuilder.build();
    const txBase64 = bytesToBase64(txBody.to_bytes());
    const approvalUri = await createApprovalURI(token);

    return res.status(200).json({
      data: txBase64,
      uri: approvalUri.customDomainUri,
      draftJson: txBody.to_json()
    });

  } catch (err) {
    console.error("Internal Server Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function getCurrentSlotNumber(CardanoWasm: any): Promise<any> {
  const response = await fetch(`${KOIOS_API_URL}/tip`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) throw new Error(`Failed to fetch current slot`);

  const data = await response.json();
  return CardanoWasm.BigNum.from_str(data[0].abs_slot.toString());
}

async function getTxUnspentOutputs(CardanoWasm: any, address: string): Promise<any> {
  const response = await fetch(`${KOIOS_API_URL}/address_info`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ _addresses: [address] }),
  });

  if (!response.ok) throw new Error(`Failed to fetch UTXOs`);

  const data = await response.json();
  const utxos = data[0]?.utxo_set || [];
  const txOutputs = CardanoWasm.TransactionUnspentOutputs.new();

  utxos.forEach((utxo: any) => {
    const input = CardanoWasm.TransactionInput.new(
      CardanoWasm.TransactionHash.from_bytes(Buffer.from(utxo.tx_hash, "hex")),
      parseInt(utxo.tx_index, 10)
    );

    const value = CardanoWasm.Value.new(CardanoWasm.BigNum.from_str(utxo.value));
    const output = CardanoWasm.TransactionOutput.new(CardanoWasm.Address.from_bech32(address), value);
    txOutputs.add(CardanoWasm.TransactionUnspentOutput.new(input, output));
  });

  return txOutputs;
}
