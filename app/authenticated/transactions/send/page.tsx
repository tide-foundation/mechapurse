"use client";

import { useState } from "react";
import { FaPaperPlane, FaExclamationTriangle, FaCheckCircle } from "react-icons/fa";
import { ImSpinner8 } from "react-icons/im";
import { Heimdall } from "../../../../tide-modules/modules/heimdall.js";
import { useAuth } from "@/components/AuthContext";
import { createApprovalURI } from "@/lib/tidecloakApi.js";
import { AddAdminAuthorization, AddDraftSignRequest, DeleteDraftSignRequest } from "@/lib/db";
import { DraftSignRequest } from "@/interfaces/interface.js";



export default function Send() {
  const { vuid, createTxDraft, signTxDraft } = useAuth();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionResult, setTransactionResult] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const createAuthorization = async (authorizerApproval: string, authorizerAuthentication: string) => {
    const response = await fetch("/api/transaction/sign", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ authorizerApproval, authorizerAuthentication }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to create authorization");

    return { authorization: data.authorization, ruleSettings: data.ruleSettings };
  }

  const addDraftRequest = async (txBody: string, data: string, dataJson: string): Promise<DraftSignRequest> => {
    const response = await fetch("/api/transaction/db/AddDraftRequest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ txBody, data, dataJson }),
    });

    const resp = await response.json();
    if (!response.ok) throw new Error(resp.error || "Unable to create authorization");
    return resp.draftReq;
  }

  const addAdminAuth = async (id: string, vuid: string, authorization: string): Promise<DraftSignRequest> => {
    const response = await fetch("/api/transaction/db/AddAdminAuth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id, vuid, authorization }),
    });

    const resp = await response.json();
    if (!response.ok) throw new Error(resp.error || "Unable to create authorization");
    return resp;
  }

  const deleteDraftRequest = async (id: string): Promise<string> => {
    const response = await fetch("/api/transaction/db/DeleteDraftRequest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });

    const resp = await response.json();
    if (!response.ok) throw new Error(resp.error || "Unable to create authorization");
    return resp;
  }

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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recipient, amount }),
      });

      const data = await response.json();
      const txbody = data.data;
      if (!response.ok) throw new Error(data.error || "Transaction failed");

      const heimdall = new Heimdall(data.uri, [vuid])
      const draft = createTxDraft(data.data)

      const draftReq = await addDraftRequest(txbody, draft, data.draftJson);
      console.log(draftReq)


      const date = new Date(draftReq.creationTimestamp);
      const expiry = (Math.floor(date.getTime() / 1000) + 7 * 24 * 60 * 60).toString(); // 1 week later

      await heimdall.openEnclave();
      const authApproval = await heimdall.getAuthorizerApproval(draft, "CardanoTx:1", expiry, "base64")
      console.log(authApproval)


      if (authApproval.accepted === true) {
        const authzAuthn = await heimdall.getAuthorizerAuthentication();
        heimdall.closeEnclave();

        const data = await createAuthorization(authApproval.data, authzAuthn);
        await addAdminAuth(draftReq.id, vuid, data.authorization)

        // TODO: have a javascript rule to see if user can commit now.
        console.log(data.ruleSettings);

        const sig = await signTxDraft(txbody, [data.authorization], data.ruleSettings, expiry);
        
        const response = await fetch("/api/transaction/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ txBody: txbody, sigBase64: sig }),
        });

        const sentResp = await response.json();
        if (!response.ok) throw new Error(sentResp.error || "Transaction failed");
        setTransactionResult(`TX Hash: ${sentResp.txHash}`);
        setSuccessMessage("Transaction successfully submitted!");
        await deleteDraftRequest(draftReq.id);
        console.log(sig)
      }

    } catch (err: any) {
      setError(`⚠️ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center px-6 py-12 w-full font-['Inter']">
      <div className="w-full max-w-lg bg-gradient-to-b from-[#1E3A8A] to-[#233A73] rounded-xl p-8 shadow-lg border border-blue-700 text-white">
        <h2 className="text-2xl font-semibold text-center mb-6 flex items-center justify-center space-x-2">
          <FaPaperPlane />
          <span>Send ADA</span>
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Recipient Address</label>
            <input
              type="text"
              className="w-full px-4 py-3 bg-blue-800 border border-blue-600 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-[#4DA8DA]"
              placeholder="Enter recipient's ADA address"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Amount (ADA)</label>
            <input
              type="number"
              className="w-full px-4 py-3 bg-blue-800 border border-blue-600 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-[#4DA8DA]"
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
            className="w-full py-4 bg-[#2979FF] hover:bg-[#1E6AE1] text-white font-bold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? (
              <>
                <ImSpinner8 className="animate-spin h-5 w-5 mr-2" />
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
          <div className="mt-4 p-3 bg-red-600/90 text-white rounded-lg flex items-center space-x-2">
            <FaExclamationTriangle />
            <span>{error}</span>
          </div>
        )}

        {transactionResult && (
          <div className="mt-6 p-4 bg-blue-800 rounded-lg border border-blue-600">
            {successMessage && (
              <div className="mb-3 p-3 bg-green-600/90 text-white rounded-lg flex items-center space-x-2">
                <FaCheckCircle />
                <span>{successMessage}</span>
              </div>
            )}
            <h3 className="text-lg font-semibold mb-2">Transaction Preview:</h3>
            <pre className="text-sm break-words whitespace-pre-wrap">
              {transactionResult}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}
