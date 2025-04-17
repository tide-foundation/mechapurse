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
 * Returns a status badge element with background color based on the status or deleteStatus.
 * 
 * Status mapping:
 * - DRAFT → grey
 * - PENDING → orange
 * - APPROVED → green
 * - DENIED → red
 * - ACTIVE → blue (default), or if deleteStatus is provided, maps deleteStatus colors.
 */
function getStatusBadge(status: string, deleteStatus?: string) {
    // Default to blue for ACTIVE or any unrecognized status
    let displayStatus = status;
    let backgroundColor = "#2196f3";
  
    // Color mapping for standard statuses
    const colorMap: { [key: string]: string } = {
      DRAFT: "#ccc",
      PENDING: "#ffa500",
      APPROVED: "#4caf50",
      DENIED: "#d32f2f",
    };
  
    if (status === "ACTIVE") {
      if (deleteStatus && colorMap[deleteStatus]) {
        // If an active item has a delete workflow, use its delete status
        displayStatus = deleteStatus;
        backgroundColor = colorMap[deleteStatus];
      }
    } else if (colorMap[status]) {
      // For non-ACTIVE statuses, use the direct mapping
      backgroundColor = colorMap[status];
    }
  
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
        {displayStatus}
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
                        <strong>Status:</strong> {getStatusBadge(changeRequest.status || "DRAFT", changeRequest.deleteStatus)}
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