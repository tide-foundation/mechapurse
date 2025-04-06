import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import { DraftSignRequest } from "@/interfaces/interface";

interface PendingApprovalsProps {
    pendingTransactions: DraftSignRequest[];
    prettyJson: (json: string) => string;
    onReview: (draft: DraftSignRequest) => void;
    scrollRef: React.RefObject<HTMLDivElement | null>;
    onScrollLeft: () => void;
    onScrollRight: () => void;
}

export default function PendingApprovals({
    pendingTransactions,
    prettyJson,
    onReview,
    scrollRef,
    onScrollLeft,
    onScrollRight,
}: PendingApprovalsProps) {
    return (
        <div className="mt-10 w-full max-w-7xl pt-8">
            <div className="app-pending-container relative">
                <h2 className="text-lg font-semibold mb-3 text-center text-[#0f172a] !pb-8">
                    Transactions Pending Approval
                </h2>
                {pendingTransactions.length <= 0 ? (
                    <div className="flex items-center justify-center h-32">
                        <p className="text-[#1e293b]">No transactions require approval.</p>
                    </div>
                ) : (
                    <>
                        {/* Scrollable Container */}
                        <div
                            ref={scrollRef}
                            className="app-scroll-container flex gap-4 overflow-x-auto px-8"
                        >
                            {pendingTransactions.map((tx) => (
                                <div key={tx.id} className="app-draft-card">
                                    <pre className="text-xs text-[#1e293b] overflow-x-auto whitespace-pre-wrap">
                                        {prettyJson(tx.draftJson)}
                                    </pre>
                                    <button
                                        onClick={() => onReview(tx)}
                                        className="app-review-button mx-auto mt-4"
                                    >
                                        Review
                                    </button>
                                </div>
                            ))}
                        </div>
                        {/* Left Arrow */}
                        <button
                            onClick={onScrollLeft}
                            className="app-scroll-button absolute left-2 top-1/2 transform -translate-y-1/2 z-50"
                        >
                            <FaArrowLeft className="text-[#1e293b]" />
                        </button>
                        {/* Right Arrow */}
                        <button
                            onClick={onScrollRight}
                            className="app-scroll-button absolute right-2 top-1/2 transform -translate-y-1/2 z-50"
                        >
                            <FaArrowRight className="text-[#1e293b]" />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
