"use client";

import React from "react";
import styles from "@/styles/AdminDashboard.module.css";

// Helper function to safely parse JSON
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

interface UserRecordCardProps {
    record: {
        username: string;
        clientId: string;
        proofDetailId: string;
        accessDraft: string;
    };
}

const UserRecordCard: React.FC<UserRecordCardProps> = ({ record }) => {
    return (
        <div
            className={styles.userRecordCard}
            style={{
                border: "1px solid #ccc",
                padding: "0.5rem",
                marginBottom: "0.5rem",
                borderRadius: "4px",
            }}
        >
            <p style={{ margin: "0 0 0.3rem" }}>
                <strong>Username:</strong> {record.username}
            </p>
            <p style={{ margin: 0 }}>
                <strong>Client ID:</strong> {record.clientId}
            </p>
            <div
                style={{
                    width: "100%",
                    height: "200px",
                    border: "1px solid #ccc",
                    padding: "0.5rem",
                    marginTop: "0.5rem",
                    backgroundColor: "#f6f8fa",
                    borderRadius: "4px",
                    overflowY: "auto",
                }}
            >
                <pre
                    style={{
                        fontSize: "0.9rem",
                        whiteSpace: "pre-wrap",
                        wordWrap: "break-word",
                        margin: 0,
                    }}
                >
                    {JSON.stringify(safeParseJSON(record.accessDraft), null, 2)}
                </pre>
            </div>
        </div>
    );
};

export default UserRecordCard;
