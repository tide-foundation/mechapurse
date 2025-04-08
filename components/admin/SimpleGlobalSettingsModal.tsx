// SimpleGlobalSettingsModal.tsx
"use client";
import { useState } from "react";
import { FaChevronRight } from "react-icons/fa";
import styles from "@/styles/AdminDashboard.module.css";
import { RuleSet, RuleDefinition, RuleCondition } from "@/interfaces/interface";
import { useAuth } from "../AuthContext";

interface SimpleGlobalSettingsModalProps {
    roleKey: string;
    settings: RuleSet;
    onClose: () => void;
    onSave: (ruleSet: RuleSet) => void;
    isThreshold: boolean;
}
const DEFAULT_THRESHOLD_KEY = "CardanoTx:1.BlindSig:1";

// --- SimpleGlobalSettingsModal Component ---
export default function SimpleGlobalSettingsModal({
    roleKey,
    settings,
    onClose,
    onSave,
    isThreshold,
}: SimpleGlobalSettingsModalProps) {
    const {walletAddressHex } = useAuth()
    const [minAmount, setMinAmount] = useState("");
    const [maxAmount, setMaxAmount] = useState("");
    const [maxFee, setMaxFee] = useState("");
    const [threshold, setThreshold] = useState("");

    const handleSave = () => {
        const rules: RuleDefinition[] = [];
        const amountConditions: RuleCondition[] = [];
        if (minAmount) {
            amountConditions.push({ method: "TOTAL_MORE_THAN", values: [minAmount] });
        }
        if (maxAmount) {
            amountConditions.push({ method: "TOTAL_LESS_THAN", values: [maxAmount] });
        }
        if (amountConditions.length > 0) {
            rules.push({
                ruleId: undefined,
                field: "Outputs.Amount",
                conditions: amountConditions,
            });
        }
        // Exclusion rule.
        rules.push({
            ruleId: undefined,
            field: "Outputs.Address",
            conditions: [{ method: "FILTER_OUT_VALUES_EQUAL_TO", values: [walletAddressHex] }],
        });
        if (maxFee) {
            rules.push({
                ruleId: undefined,
                field: "Fee",
                conditions: [{ method: "LESS_THAN", values: [maxFee] }],
            });
        }
        const newRuleSet: RuleSet = {
            rules,
        };
        if (roleKey !== DEFAULT_THRESHOLD_KEY && threshold) {
            newRuleSet.outputs = { threshold: Number(threshold) };
        }
        onSave(newRuleSet);
    };

    return (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
            <div className={styles.appCardLarge}>
                <h3 className={styles.modalTitle} style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem", wordWrap: "break-word" }}>
                    Rule Settings for <code>{roleKey}</code>
                </h3>
                <p
                    className={styles.modalSubtitle}
                    style={{
                        fontFamily: "Helvetica, Arial, sans-serif",
                        fontSize: "1.2rem",
                        lineHeight: "1.4",
                        marginBottom: "1.5rem",
                    }}
                >
                    {/* Set a basic range for <code>Outputs.Amount</code> and an optional fee limit.
                    <br />
                    Transactions with <code>Outputs.Address</code> equal to "change" will be excluded.
                    <br />
                    Global threshold rules are auto-generated from role rules. */}
                </p>
                <div className={styles.inputGroup}>
                    <label className={styles.label} style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                        Minimum Allowed Amount (1 ada = 1000000 lovelace)
                    </label>
                    <input
                        type="number"
                        value={minAmount}
                        onChange={(e) => setMinAmount(e.target.value)}
                        placeholder="e.g., 1000000"
                        className={styles.inputField}
                        style={{ fontSize: "1rem", padding: "0.75rem" }}
                    />
                </div>
                <div className={styles.inputGroup}>
                    <label className={styles.label} style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                        Maximum Allowed Amount (1 ada = 1000000 lovelace)
                    </label>
                    <input
                        type="number"
                        value={maxAmount}
                        onChange={(e) => setMaxAmount(e.target.value)}
                        placeholder="e.g., 5000000"
                        className={styles.inputField}
                        style={{ fontSize: "1rem", padding: "0.75rem" }}
                    />
                </div>
                {roleKey !== DEFAULT_THRESHOLD_KEY && (
                    <div className={styles.inputGroup}>
                        <label className={styles.label} style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                            Threshold (Required Approvals)
                        </label>
                        <input
                            type="number"
                            value={threshold}
                            onChange={(e) => setThreshold(e.target.value)}
                            placeholder="e.g., 3"
                            className={styles.inputField}
                            style={{ fontSize: "1rem", padding: "0.75rem" }}
                        />
                    </div>
                )}
                <div className={styles.inputGroup}>
                    <label className={styles.label} style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                        Maximum Fee (optional)
                    </label>
                    <input
                        type="number"
                        value={maxFee}
                        onChange={(e) => setMaxFee(e.target.value)}
                        placeholder="e.g., 50000"
                        className={styles.inputField}
                        style={{ fontSize: "1rem", padding: "0.75rem" }}
                    />
                </div>
                {/* <div className={styles.inputGroup}>
                    <label className={styles.label} style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                        Exclusion Rule
                    </label>
                    <p
                        className={styles.inputDescription}
                        style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "1rem", lineHeight: "1.4", marginBottom: "1rem" }}
                    >
                        Transactions where <code>Outputs.Address</code> equals your wallet address will be automatically excluded.
                    </p>
                </div> */}
                <div className={styles.modalActions} style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", borderTop: "1px solid #ddd", paddingTop: "1rem" }}>
                    <button onClick={onClose} className={styles.secondaryButton} style={{ fontSize: "1rem", padding: "0.6rem 1.2rem", borderRadius: "6px" }}>
                        Cancel
                    </button>
                    <button onClick={handleSave} className={styles.primaryButton} style={{ fontSize: "1rem", padding: "0.6rem 1.2rem", borderRadius: "6px" }}>
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
};