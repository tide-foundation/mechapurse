import styles from "@/styles/AdminDashboard.module.css";
import CollapsibleSection from "./CollapsibileSection";
import { useState } from "react";
import { ChangeRequest } from "@/interfaces/interface";

interface RulesChangeRequestCardProps {
    changeRequest: ChangeRequest;
    onSelect: () => void;
    selected: boolean;
}

// --- Helper Functions ---
function safeParseJSON(data: any) {
    if (typeof data === "string") {
        try {
            return JSON.parse(data);
        } catch {
            return data;
        }
    }
    return data;
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

const RulesChangeRequestCard = ({ changeRequest, onSelect, selected }: RulesChangeRequestCardProps) => {
    const [expanded, setExpanded] = useState(false);
    const newData = safeParseJSON(changeRequest.newData || changeRequest.validationSettings || {});
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
            <CollapsibleSection title="New JSON Details" expanded={expanded} onToggle={() => setExpanded(!expanded)}>
                <div
                    style={{
                        width: "100%",
                        height: "250px",
                        border: "1px solid #ccc",
                        padding: "1rem",
                        backgroundColor: "#f6f8fa",
                        borderRadius: "4px",
                        overflowY: "auto",
                    }}
                >
                    <pre style={{ fontSize: "0.9rem", whiteSpace: "pre-wrap", wordWrap: "break-word", margin: 0 }}>
                        {JSON.stringify(newData, null, 2)}
                    </pre>
                </div>
            </CollapsibleSection>
        </div>
    );
};

export default RulesChangeRequestCard