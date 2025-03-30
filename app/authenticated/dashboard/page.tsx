"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/components/AuthContext";
import { useRouter } from "next/navigation";
import { FaArrowRight, FaArrowLeft, FaWallet, FaCopy, FaCheckCircle, FaClock } from "react-icons/fa";
import { Transaction } from "@/types/Transactions";
import { AdminAuthorizationPack, CardanoTxBody, DraftSignRequest } from "@/interfaces/interface";
import { Heimdall } from "@/tide-modules/modules/heimdall";
import { signTxDraft } from "@/lib/IAMService";
import {
  createAuthorization,
  addDraftRequest,
  addAdminAuth,
  deleteDraftRequest,
  getTxAuthorization,
} from "@/lib/dbHelperMethods";
import WalletInfo from "@/components/dashboard/WalletInfo";
import RecentTransactions from "@/components/dashboard/RecentTransactions";
import PendingApprovals from "@/components/dashboard/PendingApprovals";

export default function Dashboard() {
  const { isAuthenticated, isLoading, vuid } = useAuth();
  const router = useRouter();
  const [walletAddress, setWalletAddress] = useState("");
  const [walletBalance, setWalletBalance] = useState("No balance data found");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isWalletLoading, setIsWalletLoading] = useState(true);
  const [isBalanceLoading, setIsBalanceLoading] = useState(true);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(true);
  const [pendingTransactions, setPendingTransactions] = useState<DraftSignRequest[]>([]);

  const leftColumnRef = useRef<HTMLDivElement>(null);
  const [leftColumnHeight, setLeftColumnHeight] = useState(0);

  const approvalScrollRef = useRef<HTMLDivElement>(null);

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

  const getWalletAddress = async () => {
    return await fetch("/api/dashboard?type=wallet", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
  };

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
      const walletRes = await getWalletAddress();
      const walletData = await walletRes.json();
      if (!walletRes.ok) throw new Error(walletData.error);
      const walletAddr = walletData.address;
      setWalletAddress(walletAddr);
      setIsWalletLoading(false);

      const [balanceRes, transactionsRes, pendingTransactionsRes] = await Promise.all([
        getWalletBalance(walletAddr),
        getWalletTransactions(walletAddr),
        getPendingTransactions(),
      ]);

      const [balanceData, transactionsData, pendingTransactionsData] = await Promise.all([
        balanceRes.json(),
        transactionsRes.json(),
        pendingTransactionsRes.json(),
      ]);

      if (!transactionsRes.ok) throw new Error(transactionsData.error);

      setWalletBalance(balanceData.available_balance);
      setTransactions(transactionsData.transactions);
      setPendingTransactions(pendingTransactionsData.drafts);
    } catch (error) {
      console.error("Failed to fetch wallet data:", error);
    } finally {
      setIsBalanceLoading(false);
      setIsTransactionsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      fetchWalletData();
    }
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    if (leftColumnRef.current) {
      setLeftColumnHeight(leftColumnRef.current.offsetHeight);
    }
  }, [walletAddress, walletBalance, transactions]);

  const [copied, setCopied] = useState(false);

  const prettyJson = (jsonString: string) => {
    const txBody: CardanoTxBody = JSON.parse(jsonString);
    return JSON.stringify(txBody, (k, v) => v ?? undefined, 2);
  };

  const handleReview = async (draft: DraftSignRequest) => {
    const resp = await fetch("/api/utils", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!resp.ok) throw new Error("Failed to fetch uri");
    const data = await resp.json();
    const date = new Date(draft.creationTimestamp);
    const expiry = (Math.floor(date.getTime() / 1000) + 7 * 24 * 60 * 60).toString();
    const heimdall = new Heimdall(data.uri, [vuid]);
    await heimdall.openEnclave();
    const authApproval = await heimdall.getAuthorizerApproval(draft.draft, "CardanoTx:1", expiry, "base64");

    if (authApproval.accepted === true) {
      const authzAuthn = await heimdall.getAuthorizerAuthentication();
      heimdall.closeEnclave();

      const data = await createAuthorization(authApproval.data, authzAuthn);
      await addAdminAuth(draft.id, vuid, data.authorization);

      const auths: AdminAuthorizationPack[] = await getTxAuthorization(draft.id);
      const authzList = auths.map((a) => a.adminAuthorization);
      const sig = await signTxDraft(draft.txBody, authzList, data.ruleSettings, expiry);

      const response = await fetch("/api/transaction/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txBody: draft.txBody, sigBase64: sig }),
      });

      const sentResp = await response.json();
      if (!response.ok) throw new Error(sentResp.error || "Transaction failed");
      await deleteDraftRequest(draft.id);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center px-6 py-24 w-full font-['Inter']">
      <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-3 gap-6">
        <div ref={leftColumnRef} className="md:col-span-2 space-y-6">
          <WalletInfo
            walletAddress={walletAddress}
            isWalletLoading={isWalletLoading}
            copied={copied}
            handleCopy={handleCopy}
            walletBalance={walletBalance}
            isBalanceLoading={isBalanceLoading}
            router={router}
            onSend={() => router.push("/transactions/send")}
          />
        </div>
        <RecentTransactions
          transactions={transactions}
          isTransactionsLoading={isTransactionsLoading}
        />
      </div>
      <PendingApprovals
        pendingTransactions={pendingTransactions}
        prettyJson={prettyJson}
        onReview={handleReview}
        scrollRef={approvalScrollRef}
        onScrollLeft={scrollLeft}
        onScrollRight={scrollRight}
      />
    </main>
  );
}
