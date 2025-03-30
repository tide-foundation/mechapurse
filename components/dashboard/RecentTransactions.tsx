import { FaArrowLeft, FaArrowRight, FaCheckCircle, FaClock, FaWallet } from "react-icons/fa";
import { Transaction } from "@/types/Transactions";

interface RecentTransactionsProps {
    transactions: Transaction[];
    isTransactionsLoading: boolean;
}

export default function RecentTransactions({ transactions, isTransactionsLoading }: RecentTransactionsProps) {
    return (
        <div
            className="vaultless-transactions-container"
        >
            <h2 className="text-lg font-semibold text-[#0f172a] mb-3">Recent Transactions</h2>
            <div className="flex-1 overflow-y-auto pr-2">
                {isTransactionsLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="vaultless-spinner" />
                    </div>
                ) : transactions.length === 0 ? (
                    <p className="text-center text-muted">No recent transactions found.</p>
                ) : (
                    <div className="space-y-3">
                        {transactions.map((tx) => (
                            <div
                                key={tx.tx_hash}
                                className="vaultless-transaction-row flex justify-between items-center bg-dark-card p-4 rounded-lg border border-dark-card-border"
                            >
                                {/* Transaction Direction (Sent / Received) */}
                                <span className="flex items-center space-x-2 text-[#0f172a]">
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

                                {/* Transaction Status */}
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
    );
}
