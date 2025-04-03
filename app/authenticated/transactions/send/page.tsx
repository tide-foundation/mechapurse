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
import { DraftSignRequest } from "@/interfaces/interface.js";

export default function Send() {
  const { vuid, createTxDraft, signTxDraft } = useAuth();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionResult, setTransactionResult] = useState<string | null>(
    null
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

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
    txBody: string,
    data: string,
    dataJson: string
  ): Promise<DraftSignRequest> => {
    const response = await fetch("/api/transaction/db/AddDraftRequest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ txBody, data, dataJson }),
    });

    const resp = await response.json();
    if (!response.ok) throw new Error(resp.error || "Unable to create draft");
    return resp.draftReq;
  };

  const addAdminAuth = async (
    id: string,
    vuid: string,
    authorization: string
  ): Promise<DraftSignRequest> => {
    const response = await fetch("/api/transaction/db/AddAdminAuth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, vuid, authorization }),
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setTransactionResult(null);
    setSuccessMessage("");
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
      const txbody = data.data;
      if (!response.ok) throw new Error(data.error || "Transaction failed");

      const heimdall = new Heimdall(data.uri, [vuid]);
      const draft = createTxDraft(data.data);

      const draftReq = await addDraftRequest(txbody, draft, data.draftJson);

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

        const data = await createAuthorization(
          authApproval.data,
          authzAuthn
        );
        await addAdminAuth(draftReq.id, vuid, data.authorization);

        const sig = await signTxDraft(
          txbody,
          [data.authorization],
          data.ruleSettings,
          draftReq.expiry,
        );

        const response = await fetch("/api/transaction/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ txBody: txbody, sigBase64: sig }),
        });

        const sentResp = await response.json();
        if (!response.ok) throw new Error(sentResp.error || "Transaction failed");

        setTransactionResult(`TX Hash: ${sentResp.txHash}`);
        setSuccessMessage("Transaction successfully submitted!");
        await deleteDraftRequest(draftReq.id);
      }
    } catch (err: any) {
      setError(`⚠️ ${err.message}`);
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

          <button
            type="submit"
            className="submit-button"
            disabled={loading}
          >
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

        {error && (
          <div className="error-message">
            <FaExclamationTriangle /> <span>{error}</span>
          </div>
        )}

        {transactionResult && (
          <div className="transaction-result">
            {successMessage && (
              <div className="success-message">
                <FaCheckCircle />
                <span>{successMessage}</span>
              </div>
            )}
            <h3 className="transaction-preview-title">Transaction Preview:</h3>
            <pre className="transaction-preview">{transactionResult}</pre>
          </div>
        )}
      </div>
    </main>
  );
}
