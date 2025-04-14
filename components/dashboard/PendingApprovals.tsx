import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import { DraftSignRequest, pendingTxRequestLogs } from "@/interfaces/interface";
import { useAuth } from "../AuthContext";
import styles from "@/styles/dashboard/PendingApprovals.module.css";

interface PendingApprovalsProps {
  pendingTransactions: DraftSignRequest[];
  onReview: (draft: DraftSignRequest) => void;
  onDelete: (draft: DraftSignRequest) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onScrollLeft: () => void;
  onScrollRight: () => void;
}

interface PendingTransaction {
  id: string;
  requestedBy: string;
  recipients: { address: string; amount: string }[];
  fee: string;
  originalTx: DraftSignRequest;
  logs?: pendingTxRequestLogs[];
}

// Helper: convert lovelace (string) to ADA (string)
const formatADA = (lovelace: string): string => {
  const n = Number(lovelace);
  if (isNaN(n)) return lovelace;
  return (n / 1e6).toFixed(6);
};

export default function PendingApprovals({
  pendingTransactions,
  onReview,
  onDelete,
  scrollRef,
  onScrollLeft,
  onScrollRight,
}: PendingApprovalsProps) {
  const { walletAddressHex, walletAddress } = useAuth();

  // Compute a transaction summary for display
  const txBody = (): PendingTransaction[] => {
    return pendingTransactions.map((tx) => {
      const parsedTx = JSON.parse(tx.draftJson);
      const recipients = parsedTx.outputs
        .filter(
          (output: any) =>
            output.address !== walletAddressHex &&
            output.address !== walletAddress
        )
        .map((output: any) => ({
          address: output.address,
          amount: output.amount.coin,
        }));
      return {
        id: tx.id,
        requestedBy: tx.username!,
        recipients,
        fee: parsedTx.fee,
        originalTx: tx,
        logs: tx.logs,
      };
    });
  };

  const transactions = txBody();

  // Helper: determine CSS class based on log action
  const getLogColorClass = (action: string) => {
    const lower = action.toLowerCase();
    if (lower.includes("accepted")) return styles.accepted;
    if (lower.includes("rejected")) return styles.rejected;
    return styles.neutral;
  };

  return (
    <div className="mt-10 w-full max-w-7xl pt-8 mx-auto px-4">
      <div className={styles.parentContainer}>
        <h2 className={styles.pageHeader}>Pending Transactions</h2>
        {transactions.length <= 0 ? (
          <div className={styles.emptyContainer}>
            <p className="text-gray-600">No transactions require approval.</p>
          </div>
        ) : (
          <div className={styles.navAndTransContainer}>
            {/* Left Navigation Button */}
            <button
              onClick={onScrollLeft}
              className={`${styles.navigationButton} ${styles.leftButton}`}
            >
              <FaArrowLeft />
            </button>

            {/* Transaction Detail Cards */}
            <div className={styles.transactionContainer}>
              <div ref={scrollRef} className={styles.scrollContainer}>
                {transactions.map((tx) => (
                  <div key={tx.id} className={styles.card}>
                    <div className={styles.cardTitle}>
                      <h3 className={styles.cardTitleText}>
                        Transaction Details
                      </h3>
                    </div>
                    <div className={styles.innerContainer}>
                      {/* Transaction ID */}
                      <div className={styles.detailSection}>
                        <p className={styles.detailTitle}>Transaction ID</p>
                        <p className={styles.detailContent}>{tx.id}</p>
                      </div>
                      {/* Requested By */}
                      <div className={styles.detailSection}>
                        <p className={styles.detailTitle}>Requested By</p>
                        <p className={styles.detailContent}>{tx.requestedBy}</p>
                      </div>
                      {/* Recipients */}
                      <div className={styles.detailSection}>
                        <p className={styles.detailTitle}>Recipients</p>
                        {tx.recipients && tx.recipients.length > 0 ? (
                          <div>
                            {tx.recipients.map((recipient, index) => (
                              <div
                                key={index}
                                className={styles.recipientContainer}
                              >
                                <p className={styles.subDetailTitle}>Address</p>
                                <p className={styles.detailContent}>
                                  {recipient.address}
                                </p>
                                <p className={styles.subDetailTitle}>Amount</p>
                                <div className={styles.flexBetween}>
                                  <span className={styles.detailContent}>
                                    {recipient.amount} lovelace
                                  </span>
                                  <span className={styles.subDetailInfo}>
                                    (≈ {formatADA(recipient.amount)} ADA)
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className={styles.detailContent}>
                            No external recipients.
                          </p>
                        )}
                      </div>
                      {/* Transaction Fee */}
                      <div className={styles.detailSection}>
                        <p className={styles.detailTitle}>Transaction Fee</p>
                        <div className={styles.flexBetween}>
                          <span className={styles.detailContent}>
                            {tx.fee} lovelace
                          </span>
                          <span className={styles.subDetailInfo}>
                            (≈ {formatADA(tx.fee)} ADA)
                          </span>
                        </div>
                      </div>
                      {/* Action Log Section */}
                      <div className={styles.actionLog}>
                        <p className={styles.detailTitle}>Action Log</p>
                        {tx.logs && tx.logs.length > 0 ? (
                          <ul className={styles.actionLogList}>
                            {tx.logs.map((log, index) => (
                              <li key={index}>
                                <span className="font-semibold">
                                  {log.username}:
                                </span>{" "}
                                <span className={getLogColorClass(log.action)}>
                                  {log.action}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-gray-600">
                            No actions recorded yet.
                          </p>
                        )}
                      </div>
                    </div>
                    <div className={styles.actionButtons}>
                      <button
                        onClick={() => onReview(tx.originalTx)}
                        className={styles.reviewButton}
                      >
                        Review
                      </button>
                      <button
                        onClick={() => onDelete(tx.originalTx)}
                        className={styles.deleteButton}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Navigation Button */}
            <button
              onClick={onScrollRight}
              className={`${styles.navigationButton} ${styles.rightButton}`}
            >
              <FaArrowRight />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
