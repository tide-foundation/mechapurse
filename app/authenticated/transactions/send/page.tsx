"use client";

import { useState } from "react";
import {
  FaPaperPlane,
  FaExclamationTriangle,
  FaCheckCircle,
} from "react-icons/fa";
import { ImSpinner8 } from "react-icons/im";
import { ApprovalEnclave } from "tidecloak-js";
import { useAuth } from "@/components/AuthContext";
import { DraftSignRequest } from "@/interfaces/interface.js";
import { transformCardanoTxBody } from "@/app/utils/helperMethods";
import { addAdminAuth, getCurrentRuleSettings } from "@/lib/dbHelperMethods";
import { toast } from "react-toastify";

export default function Send() {
  const {
    vuid,
    createTxDraft,
    signTxDraft,
    canProcessRequest,
    processThresholdRules,
    walletAddressHex,
    walletAddress,
  } = useAuth();

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

    return {
      authorization: data.authorization,
      ruleSettings: data.ruleSettings,
    };
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
      const config = await getCurrentRuleSettings();

      const isProcessAllowed = await canProcessRequest(
        config.ruleSettings.rules,
        transformCardanoTxBody(walletAddress, walletAddressHex, data.draftJson)
      );
      const requestSettings = await processThresholdRules(
        config.ruleSettings.rules,
        transformCardanoTxBody(walletAddress, walletAddressHex, data.draftJson)
      );

      // If the transaction is not yet ready to be processed, notify the user
      if (!isProcessAllowed) {
        const msg = `Transaction request created. You're not authorized to sign — awaiting approval from authorized user(s). (${requestSettings!.threshold} signature(s) required.)`;
        toast.info(msg);
        return;
      }

      const txbody = data.data;
      if (!response.ok) throw new Error(data.error || "Transaction failed");

      const orkURL = new URL(data.uri);
        const heimdall = new ApprovalEnclave({
          homeOrkOrigin: orkURL.origin,
          voucherURL: "",
          signed_client_origin: "",
          vendorId: ""
        }).init([vuid], data.uri);
      const draft = createTxDraft(data.data);

      const draftReq = await addDraftRequest(vuid, txbody, draft, data.draftJson);

      const authApproval = await heimdall.getAuthorizerApproval(
        draft,
        "CardanoTx:1",
        draftReq.expiry,
        "base64"
      );

      if (authApproval.accepted === true) {
        heimdall.close();
        const authzAuthn = await heimdall.getAuthorizerAuthentication();

        const authData = await createAuthorization(
          authApproval.data,
          authzAuthn
        );
        await addAdminAuth(draftReq.id, vuid, authData.authorization, false);


        if (
          (requestSettings !== null && requestSettings.threshold > 1)
        ) {
          setTransactionResult(
            `Transaction request created and is pending ${requestSettings!.threshold - 1} signature(s).`
          );
          return;
        }
        const sig = await signTxDraft(
          txbody,
          [authData.authorization],
          authData.ruleSettings,
          draftReq.expiry
        );

        const sendResponse = await fetch("/api/transaction/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ txBody: txbody, sigBase64: sig }),
        });

        const sentResp = await sendResponse.json();

        if (!sendResponse.ok) {
          throw new Error(sentResp.error || "Transaction failed");
        }

        await deleteDraftRequest(draftReq.id);

        // Display a succinct receipt message with the TX hash.
        setTransactionResult(
          `Transaction successfully submitted! Receipt (TX Hash): ${sentResp.txHash}`
        );
      }
      else {
        heimdall.close();
        await addAdminAuth(draftReq.id, vuid, "", true);
        toast.info("Request denied. Your response has been logged.");
        return;
      }

    } catch (err: any) {
      console.error(err);
      let errorMessage: string;
      if (typeof err === "string") {
        errorMessage = err;
      } else if (err instanceof Error && typeof err.message === "string") {
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
            <div className="flex justify-between items-center">
              <label className="label">Amount (ADA)</label>
              {amount && !isNaN(Number(amount)) && (
                <span className="text-sm text-gray-500">
                  {(Number(amount) * 1_000_000).toLocaleString()} lovelace
                </span>
              )}
            </div>
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
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginTop: "1rem",
            }}
          >
            <FaExclamationTriangle />
            <span>{error}</span>
          </div>
        )}

        {/* Transaction Success / Receipt Message */}
        {transactionResult && (
          <div
            className="transaction-result"
            style={{
              marginTop: "1rem",
              padding: "1rem",
              backgroundColor: "#e6ffed",
              border: "1px solid #b7eb8f",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "#237804",
              fontWeight: "bold",
              wordBreak: "break-word",
              overflowWrap: "break-word",
            }}
          >
            <FaCheckCircle />
            <span>{transactionResult}</span>
          </div>
        )}
      </div>
    </main>
  );
}
