"use client";

import { useState } from "react";
import {
  FaPaperPlane,
  FaExclamationTriangle,
  FaCheckCircle,
} from "react-icons/fa";
import { ImSpinner8 } from "react-icons/im";
import { Heimdall } from "../../../../tide-modules/modules/heimdall.js";
import { useAuth } from "@/components/AuthContext";
import { CardanoTxBody, DraftSignRequest } from "@/interfaces/interface.js";
import { processThresholdRules } from "@/lib/IAMService.js";

export default function Send() {
  const { vuid, createTxDraft, signTxDraft, canProcessRequest, processThresholdRules, walletAddressHex, walletAddress } = useAuth();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionResult, setTransactionResult] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const createAuthorization = async (
    authorizerApproval: string,
    authorizerAuthentication: string
  ) => {
    const response = await fetch("/api/transaction/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorizerApproval, authorizerAuthentication }),
    });

    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || "Unable to create authorization");

    return { authorization: data.authorization, ruleSettings: data.ruleSettings };
  };

  const addDraftRequest = async (
    vuid: string,
    txBody: string,
    data: string,
    dataJson: string
  ): Promise<DraftSignRequest> => {
    const response = await fetch("/api/transaction/db/AddDraftRequest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vuid, txBody, data, dataJson }),
    });

    const resp = await response.json();
    if (!response.ok) throw new Error(resp.error || "Unable to create draft");
    return resp.draftReq;
  };

  const addAdminAuth = async (
    id: string,
    vuid: string,
    authorization: string,
    rejected: boolean
  ): Promise<DraftSignRequest> => {
    const response = await fetch("/api/transaction/db/AddAdminAuth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, vuid, authorization, rejected }),
    });

    const resp = await response.json();
    if (!response.ok) throw new Error(resp.error || "Unable to create auth");
    return resp;
  };

  const deleteDraftRequest = async (id: string): Promise<string> => {
    const response = await fetch("/api/transaction/db/DeleteDraftRequest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    const resp = await response.json();
    if (!response.ok) throw new Error(resp.error || "Unable to delete draft");
    return resp;
  };

  /**
 * Recursively transforms all object keys so that each key starts with a capital letter.
 * If the input is an array, it transforms each element.
 *
 * @param obj - The object or array to transform.
 * @returns A new object or array with all keys starting with a capital letter.
 */
function capitalizeKeys(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(item => capitalizeKeys(item));
  } else if (obj !== null && typeof obj === "object") {
    return Object.keys(obj).reduce((acc, key) => {
      // Capitalize the first letter of the key and leave the rest of the key as is.
      const capitalKey = key.charAt(0).toUpperCase() + key.slice(1);
      acc[capitalKey] = capitalizeKeys(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
}
/**
 * Transforms the Cardano transaction body JSON string:
 * 1. Parses the JSON.
 * 2. Processes the Outputs array, replacing Amount objects (with a coin property) with that coin value.
 * 3. Ensures all keys in the object start with a capital letter.
 * 4. Returns the updated object as a JSON string.
 *
 * @param json - The JSON string representing the transaction body.
 * @returns The transformed JSON string with capitalized keys.
 */
function transformCardanoTxBody(json: string): string {
  // Parse the JSON string into an object.
  const txBody = JSON.parse(json);
  
  // Process each output:
  // If "Amount" is an object with a "coin" property, replace it with the coin value.
  if (Array.isArray(txBody.outputs)) {
    txBody.Outputs = txBody.outputs.map((output: any) => {
      if (output.amount && typeof output.amount === "object" && "coin" in output.amount) {
        output.amount = output.amount.coin;
      }
      if(output.address === walletAddress){
        output.address = walletAddressHex
      }
      return output;
    });
  }
  
  // Now, recursively ensure every key in the object starts with a capital letter.
  const transformed = capitalizeKeys(txBody);
  
  // Return the final JSON string.
  return JSON.stringify(transformed);
}

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setTransactionResult(null);
    setLoading(true);

    if (!recipient.trim()) {
      setError("Recipient address is required.");
      setLoading(false);
      return;
    }

    // Ensure that the amount is a valid positive number.
    if (!amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError("Amount must be a valid number greater than 0.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/transaction/construct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient, amount }),
      });

      const data = await response.json();
      const txbody = data.data;
      if (!response.ok) throw new Error(data.error || "Transaction failed");

      const heimdall = new Heimdall(data.uri, [vuid]);
      const draft = createTxDraft(data.data);

      const draftReq = await addDraftRequest(vuid, txbody, draft, data.draftJson);

      await heimdall.openEnclave();
      const authApproval = await heimdall.getAuthorizerApproval(
        draft,
        "CardanoTx:1",
        draftReq.expiry,
        "base64"
      );

      if (authApproval.accepted === true) {
        const authzAuthn = await heimdall.getAuthorizerAuthentication();
        heimdall.closeEnclave();

        const authData = await createAuthorization(
          authApproval.data,
          authzAuthn
        );
        await addAdminAuth(draftReq.id, vuid, authData.authorization, true);


        const isProcessAllowed = await canProcessRequest(authData.ruleSettings.rules, transformCardanoTxBody(data.draftJson))
        const requestSettings = await processThresholdRules(authData.ruleSettings.rules, transformCardanoTxBody(data.draftJson))
        if(!isProcessAllowed || (requestSettings !== null && requestSettings.threshold > 1)){

          setTransactionResult(`Transaction request created, requires ${requestSettings!.threshold} signatures`);
          return;
        }
        const sig = await signTxDraft(
          txbody,
          [authData.authorization],
          authData.ruleSettings,
          draftReq.expiry
        );

        // // If CSL returns "AUTHORIZATION REQUIRED", show a green approval waiting message.
        // if (sig === "AUTHORIZATION REQUIRED") {
        //   setTransactionResult("Transaction request created, waiting approval");
        //   return;
        // }

        const sendResponse = await fetch("/api/transaction/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ txBody: txbody, sigBase64: sig }),
        });

        const sentResp = await sendResponse.json();

        if (!sendResponse.ok) {
          throw new Error(sentResp.error || "Transaction failed");
        }

        setTransactionResult(`Transaction successfully submitted! TX Hash: ${sentResp.txHash}`);
        await deleteDraftRequest(draftReq.id);
      }
    } catch (err: any) {
      let errorMessage: string;
      if (typeof err === 'string') {
        errorMessage = err;
      } else if (err instanceof Error && typeof err.message === 'string') {
        errorMessage = err.message;
      } else {
        errorMessage = String(err);
      }
    
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="send-container">
      <div className="app-send-card">
        <div className="send-card-header">
          <FaPaperPlane />
          <span>Send ADA</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="label">Recipient Address</label>
            <input
              type="text"
              className="input-field"
              placeholder="Enter recipient's ADA address"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label className="label">Amount (ADA)</label>
            <input
              type="number"
              className="input-field"
              placeholder="Enter amount"
              min="1"
              step="0.000001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? (
              <>
                <ImSpinner8 className="animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <FaPaperPlane />
                <span>Send ADA</span>
              </>
            )}
          </button>
        </form>

        {/* Error Message */}
        {error && (
          <div
            className="error-message"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "1rem" }}
          >
            <FaExclamationTriangle />
            <span>{error}</span>
          </div>
        )}

        {/* Transaction/Success Message */}
        {transactionResult && (
          <div
            className="transaction-result"
            style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1rem" }}
          >
            <div
              className="success-message"
              style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "white" }}
            >
              <FaCheckCircle />
              <span>{transactionResult}</span>
            </div>
            {transactionResult.includes("TX Hash:") && (
              <>
                <h3 className="transaction-preview-title">Transaction Preview:</h3>
                <pre className="transaction-preview">{transactionResult}</pre>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
