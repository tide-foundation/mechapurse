"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/components/AuthContext";
import { useRouter } from "next/navigation";
import { Transaction } from "@/types/Transactions";
import { AdminAuthorizationPack, DraftSignRequest } from "@/interfaces/interface";
import { Heimdall } from "@/tide-modules/modules/heimdall";
import {
  createAuthorization,
  addAdminAuth,
  deleteDraftRequest,
  getTxAuthorization,
  getCurrentRuleSettings,
} from "@/lib/dbHelperMethods";
import WalletInfo from "@/components/dashboard/WalletInfo";
import RecentTransactions from "@/components/dashboard/RecentTransactions";
import PendingApprovals from "@/components/dashboard/PendingApprovals";
import { signTxDraft } from "@/lib/IAMService";
import { transformCardanoTxBody } from "@/app/utils/helperMethods";

// Import react-toastify for notifications
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Dashboard() {
  const {
    isAuthenticated,
    isLoading,
    vuid,
    canProcessRequest,
    processThresholdRules,
    walletAddress,
    walletAddressHex
  } = useAuth();
  const router = useRouter();
  const [walletBalance, setWalletBalance] = useState("No balance data found");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isWalletLoading, setIsWalletLoading] = useState(false);
  const [isBalanceLoading, setIsBalanceLoading] = useState(true);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(true);
  const [pendingTransactions, setPendingTransactions] = useState<DraftSignRequest[]>([]);

  const leftColumnRef = useRef<HTMLDivElement>(null);

  const approvalScrollRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const handleTxDelete = async (draft: DraftSignRequest) => {
    await fetch(`/api/transaction/db/DeleteDraftRequest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({id: draft.id})
    });

    // Refresh all the data on the screen
    await fetchWalletData();
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const scrollLeft = () => {
    if (approvalScrollRef.current) {
      approvalScrollRef.current.scrollBy({ left: -300, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (approvalScrollRef.current) {
      approvalScrollRef.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  // API calls
  const getWalletBalance = async (walletAddress: string) => {
    return await fetch(`/api/dashboard?type=balance&wallet=${walletAddress}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
  };

  const getWalletTransactions = async (walletAddress: string) => {
    return await fetch(`/api/dashboard?type=transactions&wallet=${walletAddress}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
  };

  const getPendingTransactions = async () => {
    return await fetch("/api/transaction/db/GetPendingTransactions", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
  };

  const fetchWalletData = async () => {
    try {
      const [balanceRes, transactionsRes, pendingTransactionsRes] = await Promise.all([
        getWalletBalance(walletAddress),
        getWalletTransactions(walletAddress),
        getPendingTransactions(),
      ]);

      const [balanceData, transactionsData, pendingTransactionsData] = await Promise.all([
        balanceRes.json(),
        transactionsRes.json(),
        pendingTransactionsRes.json(),
      ]);

      if (!transactionsRes.ok) throw new Error(transactionsData.error);

      // Fetch usernames in parallel for each VUID
      const enrichedPendingTransactions = await Promise.all(
        pendingTransactionsData.drafts.map(async (tx: any) => {
          return { ...tx };
        })
      );

      setWalletBalance(balanceData.available_balance);
      setTransactions(transactionsData.transactions);
      setPendingTransactions(enrichedPendingTransactions)

    } catch (error) {
      console.error("Failed to fetch wallet data:", error);
      toast.error("Error loading wallet data");
    } finally {
      setIsBalanceLoading(false);
      setIsTransactionsLoading(false);
    }
  };


  // Initial fetch
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      fetchWalletData();
    }
  }, [isAuthenticated, isLoading, walletAddress]);

  // Updated review handler with notifications, UI refresh, and polling support
  const handleReview = async (draft: DraftSignRequest) => {
    try {
      // Fetch the URI required for processing
      const resp = await fetch("/api/utils", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (!resp.ok) throw new Error("Failed to fetch uri");
      const data = await resp.json();
      const config = await getCurrentRuleSettings();

      const isProcessAllowed = await canProcessRequest(
        config.ruleSettings.rules,
        transformCardanoTxBody(walletAddress, walletAddressHex, draft.draftJson)
      );
      const requestSettings = await processThresholdRules(
        config.ruleSettings.rules,
        transformCardanoTxBody(walletAddress, walletAddressHex, draft.draftJson)
      );

      // If the transaction is not yet ready to be processed, notify the user
      if (!isProcessAllowed) {
        const msg = `Transaction request created. You're not authorized to sign — awaiting approval from authorized user(s). (${requestSettings!.threshold} signature(s) required.)`;
        toast.info(msg);
        return;
      }
      const auths: AdminAuthorizationPack[] = await getTxAuthorization(draft.id);
      const authzList = auths.map((a) => a.authorization);

      if(requestSettings !== null && authzList.length  < requestSettings.threshold) {
        const expiry = draft.expiry;
        const heimdall = new Heimdall(data.uri, [vuid]);
        await heimdall.openEnclave();
        const authApproval = await heimdall.getAuthorizerApproval(draft.draft, "CardanoTx:1", expiry, "base64");
  
        if (authApproval.accepted === true) {
          heimdall.closeEnclave();
          const authzAuthn = await heimdall.getAuthorizerAuthentication();  
          const authData = await createAuthorization(authApproval.data, authzAuthn);
          const authorization = await addAdminAuth(draft.id, vuid, authData.authorization, false);
          authzList.push(authorization.auth)
        } else {
          heimdall.closeEnclave();
          await addAdminAuth(draft.id, vuid, "", true);
          toast.info("Request denied. Your response has been logged.");
          return;
        }

        if(authzList.length  < requestSettings.threshold){
          const remaining = requestSettings ? requestSettings.threshold - authzList.length : 0;
          toast.info(`Transaction request created, requires ${remaining} more signature(s)!`);
          return;
        }
        // Finalize and sign the transaction
        const sig = await signTxDraft(draft.txBody, authzList, config.ruleSettings, expiry);
        const response = await fetch("/api/transaction/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ txBody: draft.txBody, sigBase64: sig }),
        });

        const sentResp = await response.json();
        if (!response.ok) throw new Error(sentResp.error || "Transaction failed");

        // Remove the draft after a successful transaction
        await deleteDraftRequest(draft.id);
        // Notify success to the user
        toast.success("Transaction sent successfully!");
        // Refresh all the data on the screen
        await fetchWalletData();
      }
    } catch (error) {
      console.error("Error processing transaction review:", error);
      toast.error("Transaction processing failed");
    }
  };

  if (isLoading) {
    return <main></main>;
  }

  return (
    <main className="flex flex-col items-center justify-center px-6 py-24 w-full font-['Inter']">
      <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-3 gap-2 !pt-8">
        <div ref={leftColumnRef} className="md:col-span-2 space-y-6">
          <WalletInfo
            walletAddress={walletAddress}
            isWalletLoading={isWalletLoading}
            copied={copied}
            handleCopy={handleCopy}
            walletBalance={walletBalance}
            isBalanceLoading={isBalanceLoading}
            router={router}
            onSend={() => router.push("/authenticated/transactions/send")}
          />
        </div>
        <RecentTransactions
          transactions={transactions}
          isTransactionsLoading={isTransactionsLoading}
        />
      </div>
      <PendingApprovals
        pendingTransactions={pendingTransactions}
        onReview={handleReview}
        scrollRef={approvalScrollRef}
        onScrollLeft={scrollLeft}
        onScrollRight={scrollRight}
        onDelete={handleTxDelete}
      />

      {/* ToastContainer renders the toast notifications */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </main>
  );
}
