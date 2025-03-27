"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/components/AuthContext";
import { useRouter } from "next/navigation";
import { FaArrowRight, FaArrowLeft, FaWallet, FaCopy, FaCheckCircle, FaClock } from "react-icons/fa";
import { Transaction } from "@/types/Transactions";
import { CardanoTxBody, DraftSignRequest } from "@/interfaces/interface";

export default function Dashboard() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [walletAddress, setWalletAddress] = useState("");
  const [walletBalance, setWalletBalance] = useState("No balance data found");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isWalletLoading, setIsWalletLoading] = useState(true);
  const [isBalanceLoading, setIsBalanceLoading] = useState(true);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(true);
  const [pendingTransactions, setPendingTransactions] = useState<DraftSignRequest[]>([]);


  // Ref and state to match left section height
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const [leftColumnHeight, setLeftColumnHeight] = useState(0);

  // Ref for the horizontal scroll container (approval transactions)
  const approvalScrollRef = useRef<HTMLDivElement>(null);

  // For this example, we assume that transactions with a "Pending" status require approval.
  const approvalTransactions = transactions.filter((tx) => tx.status === "Pending");

  const prettyJson = (jsonString: string) => {
    const txBody: CardanoTxBody = JSON.parse(jsonString);
    return JSON.stringify(txBody, (k, v) => v ?? undefined, 2)
  }

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
      headers: {
        "Content-Type": "application/json",
      },
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

      // Run fetch requests in parallel
      const [balanceRes, transactionsRes, pendingTransactionsRes] = await Promise.all([
        getWalletBalance(walletAddr),
        getWalletTransactions(walletAddr),
        getPendingTransactions()
      ]);

      // Parse JSON responses in parallel
      const [balanceData, transactionsData, pendingTransactionsData] = await Promise.all([
        balanceRes.json(),
        transactionsRes.json(),
        pendingTransactionsRes.json()
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

  // Update left section height when its content changes
  useEffect(() => {
    if (leftColumnRef.current) {
      setLeftColumnHeight(leftColumnRef.current.offsetHeight);
    }
  }, [walletAddress, walletBalance, transactions]);


  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Functions to scroll the approval transactions container
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

  return (
    <main className="flex flex-col items-center justify-center px-6 py-24 w-full font-['Inter']">
      <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Section - Wallet Info */}
        <div ref={leftColumnRef} className="md:col-span-2 space-y-6">
          {/* Wallet Address */}
          <div className="bg-gradient-to-b from-blue-900 to-blue-800 rounded-xl p-6 shadow-lg border border-blue-700 text-center">
            <h2 className="text-lg font-semibold text-white mb-3">Wallet Address</h2>
            {isWalletLoading ? (
              <div className="flex justify-center">
                <div className="h-6 w-6 border-4 border-blue-500 border-solid rounded-full animate-spin border-t-transparent"></div>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-blue-800 p-3 rounded-lg border border-blue-700">
                <span className="truncate text-white text-sm w-4/5 text-left">{walletAddress}</span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-4 py-2 bg-[#2979FF] hover:bg-[#1E6AE1] text-white rounded-lg text-sm transition-all duration-300"
                >
                  {copied ? "Copied!" : "Copy"}
                  <FaCopy />
                </button>
              </div>
            )}
          </div>

          {/* Available Balance */}
          <div className="bg-gradient-to-b from-[#1E3A8A] to-[#233A73] rounded-xl p-6 shadow-lg border border-blue-700 text-center">
            <h2 className="text-lg font-semibold text-white mb-3">Available Balance</h2>
            {isBalanceLoading ? (
              <div className="flex justify-center">
                <div className="h-6 w-6 border-4 border-blue-500 border-solid rounded-full animate-spin border-t-transparent"></div>
              </div>
            ) : (
              <p className="text-5xl font-extrabold text-white">{walletBalance}</p>
            )}
          </div>

          {/* Send Cardano Button */}
          <div className="bg-gradient-to-b from-blue-900 to-blue-800 rounded-xl p-6 shadow-lg border border-blue-700 text-center">
            <h2 className="text-lg font-semibold text-white mb-3">Send Cardano</h2>
            <button
              onClick={() => router.push("/authenticated/transactions/send")}
              className="w-full py-4 bg-[#2979FF] hover:bg-[#1E6AE1] text-white font-bold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              SEND ADA
            </button>
          </div>
        </div>

        {/* Recent Transactions - matching left section height */}
        <div
          className="bg-gradient-to-b from-[#1E3A8A] to-[#233A73] rounded-xl p-6 shadow-lg border border-blue-700 overflow-hidden flex flex-col"
          style={{ height: leftColumnHeight }}
        >
          <h2 className="text-lg font-semibold text-white mb-3">Recent Transactions</h2>
          <div className="flex-1 overflow-y-auto pr-2">
            {isTransactionsLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="h-12 w-12 border-4 border-blue-500 border-solid rounded-full animate-spin border-t-transparent"></div>
              </div>
            ) : transactions.length === 0 ? (
              <p className="text-center text-blue-300">No recent transactions found.</p>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div
                    key={tx.tx_hash}
                    className="flex items-center justify-between bg-blue-800/80 p-4 rounded-lg border border-blue-700 transition-all duration-200 hover:bg-blue-700/80"
                  >
                    <span className="text-white text-sm flex items-center space-x-3">
                      {tx.direction === "Sent" ? (
                        <>
                          <FaWallet className="text-red-400 text-lg" />
                          <FaArrowRight className="text-red-400 text-lg" />
                          <span>Sent {tx.amount}</span>
                        </>
                      ) : (
                        <>
                          <FaWallet className="text-green-400 text-lg" />
                          <FaArrowLeft className="text-green-400 text-lg" />
                          <span>Received {tx.amount}</span>
                        </>
                      )}
                    </span>
                    <div className="flex items-center space-x-2">
                      {tx.status === "Success" ? (
                        <span className="text-green-400 flex items-center space-x-1">
                          <FaCheckCircle className="text-lg" />
                          <span className="text-sm">Success</span>
                        </span>
                      ) : (
                        <span className="text-yellow-400 flex items-center space-x-1">
                          <FaClock className="text-lg" />
                          <span className="text-sm">Pending</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

   {/* Transactions Pending Approval - Horizontal Scroll */}
    <div className="mt-10 w-full max-w-7xl">
    {/* Outer Card Container */}
    <div className="bg-gradient-to-b from-[#1E3A8A] to-[#233A73] 
                    rounded-xl p-6 shadow-lg border border-blue-700 
                    w-full relative overflow-hidden">

        {/* Title */}
        <h2 className="text-lg font-semibold text-white mb-3 text-center">
        Transactions Pending Approval
        </h2>

        {/* Conditional Content */}
        {pendingTransactions.length <= 0 ? (
        // If no transactions need approval, show a single message
        <div className="flex items-center justify-center h-32">
            <p className="text-blue-300">No transactions require approval.</p>
        </div>
        ) : (
        // If there are transactions, show the arrows + scrollable container
        <>
            {/* Left Scroll Button */}
            <button
            onClick={scrollLeft}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 
                        z-10 bg-blue-700 p-2 rounded-full"
            >
            <FaArrowLeft className="text-white" />
            </button>

            {/* Scrollable Container */}
            <div
            ref={approvalScrollRef}
            className="flex space-x-4 overflow-x-auto px-6 py-2 scrollbar-hide"
            >
            {pendingTransactions.map((tx) => (
                <div
                key={tx.id}
                className="min-w-[300px] bg-blue-800/80 
                            rounded-xl p-4 border border-blue-700 flex flex-col"
                >
                <pre className="text-xs text-white overflow-x-auto whitespace-pre-wrap">
                    {
                        prettyJson(tx.draftJson)
                    }
                </pre>
                <button className="mt-auto mx-auto px-4 py-2 bg-[#2979FF] hover:bg-[#1E6AE1] 
                                    text-white font-bold rounded-xl">
                    Review
                </button>
                </div>
            ))}
            </div>

            {/* Right Scroll Button */}
            <button
            onClick={scrollRight}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 
                        z-10 bg-blue-700 p-2 rounded-full"
            >
            <FaArrowRight className="text-white" />
            </button>
        </>
        )}
    </div>
    </div>

    </main>
  );
}
