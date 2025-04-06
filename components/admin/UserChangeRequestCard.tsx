import styles from "@/styles/AdminDashboard.module.css";
import { useState } from "react";
import CollapsibleSection from "./CollapsibileSection";
import { ChangeRequest, UserChangeRecord } from "@/interfaces/interface";
import UserRecordCard from "./UserRecordCard";

interface UserChangeRequestCardProps {
    changeRequest: ChangeRequest;
    onSelect: () => void;
    selected: boolean;
}

/**
 * Returns a status badge element with background color based on the status.
 * DRAFT → grey, PENDING → orange, APPROVED → green, DENIED → red.
 */
function getStatusBadge(status: string) {
    let backgroundColor = "#ccc"; // default for DRAFT
    if (status === "PENDING") backgroundColor = "#ffa500";
    else if (status === "APPROVED") backgroundColor = "#4caf50";
    else if (status === "DENIED") backgroundColor = "#d32f2f";
    return (
        <span
            style={{
                backgroundColor,
                color: "#fff",
                padding: "0.3rem 0.6rem",
                borderRadius: "100px",
                fontWeight: "bold",
            }}
        >
            {status}
        </span>
    );
}

const UserChangeRequestCard = ({ changeRequest, onSelect, selected }: UserChangeRequestCardProps) => {
    const records: UserChangeRecord[] = changeRequest.userRecord || [];
    const [recordsExpanded, setRecordsExpanded] = useState(false);
    return (
        <div
            className={styles.changeRequestCard}
            onClick={onSelect}
            style={{
                border: selected ? "2px solid #007bba" : "1px solid #ccc",
                padding: "1rem",
                marginBottom: "1rem",
                cursor: "pointer",
            }}
        >
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                    <div>
                        <strong>Action:</strong> {changeRequest.action || "N/A"}
                    </div>
                    <div>
                        <strong>Status:</strong> {getStatusBadge(changeRequest.status || "DRAFT")}
                    </div>
                    <div>
                        <strong>Role:</strong> {changeRequest.role || "N/A"}
                    </div>
                </div>
            </div>
            <div style={{ marginBottom: "1rem" }}>
                <strong>Details:</strong> {changeRequest.details || "No details provided."}
            </div>
            <CollapsibleSection
                title={`User Records (${records.length})`}
                expanded={recordsExpanded}
                onToggle={() => setRecordsExpanded(!recordsExpanded)}
            >
                <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                    {records.map((record) => (
                        <UserRecordCard key={record.proofDetailId} record={record} />
                    ))}
                </div>
            </CollapsibleSection>
        </div>
    );
};

export default UserChangeRequestCard;