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
        <div className="mt-10 w-full max-w-7xl">
            <div className="app-pending-container">
                <h2 className="text-lg font-semibold mb-3 text-center">
                    Transactions Pending Approval
                </h2>
                {pendingTransactions.length <= 0 ? (
                    <div className="flex items-center justify-center h-32">
                        <p>No transactions require approval.</p>
                    </div>
                ) : (
                    <>
                        <button
                            onClick={onScrollLeft}
                            className="app-scroll-button left-4"
                        >
                            <FaArrowLeft className="text-white" />
                        </button>

                        <div ref={scrollRef} className="app-scroll-container">
                            {pendingTransactions.map((tx) => (
                                <div key={tx.id} className="app-draft-card">
                                    <pre className="text-xs text-white overflow-x-auto whitespace-pre-wrap">
                                        {prettyJson(tx.draftJson)}
                                    </pre>
                                    <button
                                        onClick={() => onReview(tx)}
                                        className="app-review-button"
                                    >
                                        Review
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={onScrollRight}
                            className="app-scroll-button right-4"
                        >
                            <FaArrowRight className="text-white" />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
