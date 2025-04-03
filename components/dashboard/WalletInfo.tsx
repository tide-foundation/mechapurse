import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { FaCopy } from "react-icons/fa";

interface WalletInfoProps {
    walletAddress: string;
    walletBalance: string;
    isWalletLoading: boolean;
    isBalanceLoading: boolean;
    handleCopy: () => void;
    copied: boolean;
    onSend: () => void;
    router: AppRouterInstance;
}

export default function WalletInfo({
    walletAddress,
    walletBalance,
    isWalletLoading,
    isBalanceLoading,
    handleCopy,
    copied,
    onSend,
    router,
}: WalletInfoProps) {
    return (
        <div className="space-y-6">
            {/* Wallet Address */}
            <div className="app-card text-center">
                <h2 className="text-lg font-semibold text-white mb-3">Wallet Address</h2>
                {isWalletLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="app-spinner" />
                    </div>
                ) : (
                    <div className="app-wallet-address flex items-center justify-between">
                        <span className="wallet-address-text truncate">{walletAddress}</span>
                        <button
                            onClick={handleCopy}
                            className="app-button copy-button"
                        >
                            {copied ? "Copied!" : "Copy"} <FaCopy />
                        </button>
                    </div>
                )}
            </div>

            {/* Wallet Balance */}
            <div className="app-card text-center app-available-balance">
                <h2 className="text-lg font-semibold text-white mb-3">Available Balance</h2>
                {isBalanceLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="app-spinner" />
                    </div>
                ) : (
                    <p className="text-5xl font-extrabold text-white">{walletBalance}</p>
                )}
            </div>

            {/* Send Button */}
            <div className="app-card text-center">
                <h2 className="text-lg font-semibold text-white mb-3">Send Cardano</h2>
                <button
                    onClick={onSend}
                    className="app-button w-full py-4 text-white font-bold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                    SEND ADA
                </button>
            </div>
        </div>
    );
}
