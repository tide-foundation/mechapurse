import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import { DraftSignRequest } from "@/interfaces/interface";
import { useAuth } from "../AuthContext";

interface PendingApprovalsProps {
    pendingTransactions: DraftSignRequest[];
    prettyJson: (json: string) => string;
    onReview: (draft: DraftSignRequest) => void;
    scrollRef: React.RefObject<HTMLDivElement | null>;
    onScrollLeft: () => void;
    onScrollRight: () => void;
}

interface PendingTransaction {
    id: string;
    sender: string;
    recipients: { address: string; amount: string }[];
    fee: string;
    originalTx: DraftSignRequest;
}

export default function PendingApprovals({
    pendingTransactions,
    onReview,
    scrollRef,
    onScrollLeft,
    onScrollRight,
}: PendingApprovalsProps) {
    const { walletAddressHex, walletAddress } = useAuth();

    // Compute a detailed transaction summary for display
    const txBody = (): PendingTransaction[] => {
        return pendingTransactions.map((tx) => {
            const parsedTx = JSON.parse(tx.draftJson);
            const recipients = parsedTx.outputs
                .filter(
                    (output: any) =>
                        output.address !== walletAddressHex && output.address !== walletAddress
                )
                .map((output: any) => ({
                    address: output.address,
                    amount: output.amount.coin,
                }));
            return {
                id: tx.id,
                sender: tx.userId,
                recipients,
                fee: parsedTx.fee,
                originalTx: tx,
            };
        });
    };

    const transactions = txBody();

    return (
        <div className="mt-10 w-full max-w-7xl pt-8">
            {/* Main Container */}
            <div className="app-pending-container relative">
                <h2 className="text-2xl font-bold mb-4 text-center text-[#0f172a] !pb-6">
                    Transactions Pending Approval
                </h2>
                {transactions.length <= 0 ? (
                    <div className="flex items-center justify-center h-32">
                        <p className="text-[#1e293b]">No transactions require approval.</p>
                    </div>
                ) : (
                    <>
                        {/* Scrollable Horizontal Container */}
                        <div ref={scrollRef} className="flex gap-4 overflow-x-auto px-6 py-4">
                            {transactions.map((tx) => (
                                <div
                                    key={tx.id}
                                    className="bg-white w-[380px] h-[420px] p-4 rounded-lg shadow-md border border-gray-800 flex flex-col  transition-colors duration-300"
                                >
                                    {/* Scrollable content area */}
                                    <div className="flex-grow overflow-y-auto space-y-4">
                                        {/* Transaction ID */}
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wide">
                                                Transaction ID
                                            </p>
                                            <p className="text-sm font-semibold text-gray-800 break-words">
                                                {tx.id}
                                            </p>
                                        </div>

                                        {/* Sender */}
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wide">
                                                From
                                            </p>
                                            <p className="text-sm font-medium text-gray-700 break-words">
                                                {tx.sender}
                                            </p>
                                        </div>

                                        {/* Recipients */}
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                                                Recipients
                                            </p>
                                            {tx.recipients && tx.recipients.length > 0 ? (
                                                <div className="space-y-2">
                                                    {tx.recipients.map((recipient, index) => (
                                                        <div key={index} className="bg-gray-50 p-2 rounded">
                                                            <p className="text-xs text-gray-500">Address</p>
                                                            <p className="text-sm font-medium text-gray-800 break-words whitespace-normal">
                                                                {recipient.address}
                                                            </p>
                                                            <p className="text-xs text-gray-500 mt-2">Value</p>
                                                            <p className="text-sm font-semibold text-blue-600">
                                                                {recipient.amount}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-600">
                                                    No external recipients.
                                                </p>
                                            )}
                                        </div>

                                        {/* Fee */}
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wide">
                                                Transaction Fee
                                            </p>
                                            <p className="text-sm font-medium text-gray-700">{tx.fee}</p>
                                        </div>
                                    </div>

                                    {/* Review Button */}
                                    <button
                                        onClick={() => onReview(tx.originalTx)}
                                        className="mt-4 py-2 w-full bg-blue-500 text-white rounded hover:bg-blue-600 transition duration-150 hover:ring-2"
                                    >
                                        Review &amp; Approve
                                    </button>
                                </div>
                            ))}
                        </div>
                        {/* Left Arrow */}
                        <button
                            onClick={onScrollLeft}
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 z-50 p-2 bg-white rounded-full shadow hover:bg-gray-100"
                        >
                            <FaArrowLeft className="text-blue-600 transition-colors" />
                        </button>
                        {/* Right Arrow */}
                        <button
                            onClick={onScrollRight}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 z-50 p-2 bg-white rounded-full shadow hover:bg-gray-100"
                        >
                            <FaArrowRight className="text-blue-600 transition-colors" />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
