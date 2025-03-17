"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthContext";
import { useRouter } from "next/navigation";
import { FaArrowRight, FaArrowLeft, FaWallet, FaCopy, FaCheckCircle, FaClock } from "react-icons/fa";
import { Transaction } from "@/types/Transactions";

export default function Dashboard() {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const [walletAddress, setWalletAddress] = useState("");
    const [walletBalance, setWalletBalance] = useState("No balance data found");
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isWalletLoading, setIsWalletLoading] = useState(true);
    const [isBalanceLoading, setIsBalanceLoading] = useState(true);
    const [isTransactionsLoading, setIsTransactionsLoading] = useState(true);


    const getWalletAddress = async () => {
        return await fetch("/api/dashboard?type=wallet", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",

            },
        });

    };

    const getWalletBalance = async (walletAddress: string) => {
        return await fetch(`/api/dashboard?type=balance&wallet=${walletAddress}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

    };

    const getWalletTransactions = async (walletAddress: string) => {
        return await fetch(`/api/dashboard?type=transactions&wallet=${walletAddress}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",

            },
        });
    }

    const fetchWalletData = async () => {
        try {

            const walletRes = await getWalletAddress();
            const walletData = await walletRes.json();
            if (!walletRes.ok) throw new Error(walletData.error);
            const walletAddress = walletData.address;
            setWalletAddress(walletAddress);
            setIsWalletLoading(false);


            // Run all fetch requests in parallel
            const [balanceRes, transactionsRes] = await Promise.all([
                getWalletBalance(walletAddress),
                getWalletTransactions(walletAddress),
            ]);

            // Parse JSON responses in parallel
            const [balanceData, transactionsData] = await Promise.all([
                balanceRes.json(),
                transactionsRes.json(),
            ]);

            if (!transactionsRes.ok) throw new Error(transactionsData.error);

            setWalletBalance(balanceData.available_balance);
            setTransactions(transactionsData.transactions);
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

    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(walletAddress);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <main className="flex flex-col items-center justify-center px-6 py-24 w-full font-['Inter']">
            <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Section - Wallet Info */}
                <div className="md:col-span-2 space-y-6">
                    {/* Wallet Address */}
                    <div className="bg-gradient-to-b from-blue-900 to-blue-800 rounded-xl p-6 shadow-lg border border-blue-700 text-center">
                        <h2 className="text-lg font-semibold text-white mb-3 text-center">Wallet Address</h2>
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

                    {/* Send ADA Button */}
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
                {/* Transactions */}
                <div className="bg-gradient-to-b from-[#1E3A8A] to-[#233A73] rounded-xl p-6 shadow-lg border border-blue-700 h-[487px] overflow-hidden flex flex-col">
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
                                    <div key={tx.tx_hash} className="flex items-center justify-between bg-blue-800/80 p-4 rounded-lg border border-blue-700 transition-all duration-200 hover:bg-blue-700/80">
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
        </main>
    );
}
