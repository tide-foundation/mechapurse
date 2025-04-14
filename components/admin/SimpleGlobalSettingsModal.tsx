"use client";
import { useState, useEffect } from "react";
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

export default function SimpleGlobalSettingsModal({
  roleKey,
  settings,
  onClose,
  onSave,
  isThreshold,
}: SimpleGlobalSettingsModalProps) {
  const { walletAddressHex } = useAuth();

  // The user enters values in ADA.
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  // For threshold, we expect a number (approvals).
  const [threshold, setThreshold] = useState("");
  // Maximum fee is entered directly in lovelace.
  const [maxFee, setMaxFee] = useState("");

  // When editing, pre-populate the fields with the inverse of the adjustments.
  useEffect(() => {
    if (settings && settings.rules) {
      // Find the rule for Outputs.Amount.
      const amountRule = settings.rules.find(rule => rule.field === "Outputs.Amount");
      if (amountRule && amountRule.conditions?.length) {
        const minCondition = amountRule.conditions.find(cond => cond.method === "TOTAL_MORE_THAN");
        const maxCondition = amountRule.conditions.find(cond => cond.method === "TOTAL_LESS_THAN");
        if (minCondition && minCondition.values?.[0]) {
          // Stored value = (userInput - 1) * 1,000,000.
          // Displayed value = (stored value / 1,000,000) + 1.
          setMinAmount(((Number(minCondition.values[0]) / 1_000_000) + 1).toString());
        }
        if (maxCondition && maxCondition.values?.[0]) {
          // Stored value = (userInput + 1) * 1,000,000.
          // Displayed value = (stored value / 1,000,000) - 1.
          setMaxAmount(((Number(maxCondition.values[0]) / 1_000_000) - 1).toString());
        }
      }
      // Get the fee rule, if present.
      const feeRule = settings.rules.find(rule => rule.field === "Fee");
      if (feeRule && feeRule.conditions?.length) {
        const feeCondition = feeRule.conditions.find(cond => cond.method === "LESS_THAN");
        if (feeCondition && feeCondition.values?.[0]) {
          setMaxFee(feeCondition.values[0]);
        }
      }
    }
    // For roles other than the global threshold, pre-populate threshold if available.
    if (roleKey !== DEFAULT_THRESHOLD_KEY && settings.outputs && settings.outputs.threshold) {
      setThreshold(settings.outputs.threshold.toString());
    }
  }, [settings, roleKey]);

  // When saving, apply the adjustments for non-inclusive methods.
  const handleSave = () => {
    const rules: RuleDefinition[] = [];
    const amountConditions: RuleCondition[] = [];
    const minAmountNumber = Number(minAmount);
    const maxAmountNumber = Number(maxAmount);

    // Save adjusted values: subtract 1 for min and add 1 for max.
    if (minAmount && !isNaN(minAmountNumber)) {
      amountConditions.push({
        method: "TOTAL_MORE_THAN",
        values: [((minAmountNumber - 1) * 1_000_000).toString()],
      });
    }
    if (maxAmount && !isNaN(maxAmountNumber)) {
      amountConditions.push({
        method: "TOTAL_LESS_THAN",
        values: [((maxAmountNumber + 1) * 1_000_000).toString()],
      });
    }
    if (amountConditions.length > 0) {
      rules.push({
        ruleId: undefined,
        field: "Outputs.Amount",
        conditions: amountConditions,
      });
    }
    // Always add the exclusion rule for the wallet address.
    rules.push({
      ruleId: undefined,
      field: "Outputs.Address",
      conditions: [{ method: "FILTER_OUT_VALUES_EQUAL_TO", values: [walletAddressHex] }],
    });
    // Take the fee value as provided (in lovelace).
    if (maxFee) {
      rules.push({
        ruleId: undefined,
        field: "Fee",
        conditions: [{ method: "LESS_THAN", values: [maxFee] }],
      });
    }
    const newRuleSet: RuleSet = { rules };
    if (roleKey !== DEFAULT_THRESHOLD_KEY && threshold) {
      newRuleSet.outputs = { threshold: Number(threshold) };
    }
    onSave(newRuleSet);
  };

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true">
      <div className={styles.appCardLarge}>
        <h3
          className={styles.modalTitle}
          style={{
            fontSize: "1.5rem",
            fontWeight: "bold",
            marginBottom: "0.5rem",
            wordWrap: "break-word",
          }}
        >
          Rule Settings for <code>{roleKey}</code>
        </h3>
        {/* Informational Note */}
        <p
          className={styles.modalSubtitle}
          style={{
            fontFamily: "Helvetica, Arial, sans-serif",
            fontSize: "1rem",
            lineHeight: "1.4",
            marginBottom: "1.5rem",
            color: "#555",
          }}
        >
          Note: Enter amounts in ADA. They will be converted to lovelace (1 ADA = 1,000,000 lovelace) in the transaction body.
        </p>
        <div className={styles.inputGroup}>
          <label
            className={styles.label}
            style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.5rem" }}
          >
            Minimum Allowed Amount (in ADA)
          </label>
          <input
            type="number"
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
            placeholder="Enter ADA amount"
            className={styles.inputField}
            style={{ fontSize: "1rem", padding: "0.75rem" }}
          />
          {/* Preview displays the direct conversion (without adjustments) */}
          {minAmount && !isNaN(Number(minAmount)) && (
            <small style={{ color: "#555", marginTop: "0.25rem", display: "block" }}>
              {minAmount} ADA = {(Number(minAmount) * 1_000_000).toLocaleString()} lovelace
            </small>
          )}
        </div>
        <div className={styles.inputGroup}>
          <label
            className={styles.label}
            style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.5rem" }}
          >
            Maximum Allowed Amount (in ADA)
          </label>
          <input
            type="number"
            value={maxAmount}
            onChange={(e) => setMaxAmount(e.target.value)}
            placeholder="Enter ADA amount"
            className={styles.inputField}
            style={{ fontSize: "1rem", padding: "0.75rem" }}
          />
          {maxAmount && !isNaN(Number(maxAmount)) && (
            <small style={{ color: "#555", marginTop: "0.25rem", display: "block" }}>
              {maxAmount} ADA = {(Number(maxAmount) * 1_000_000).toLocaleString()} lovelace
            </small>
          )}
        </div>
        {roleKey !== DEFAULT_THRESHOLD_KEY && (
          <div className={styles.inputGroup}>
            <label
              className={styles.label}
              style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.5rem" }}
            >
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
        {/* Maximum fee remains at the bottom; no conversion adjustment applied */}
        <div className={styles.inputGroup}>
          <label
            className={styles.label}
            style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.5rem" }}
          >
            Maximum Fee (optional)
          </label>
          <input
            type="number"
            value={maxFee}
            onChange={(e) => setMaxFee(e.target.value)}
            placeholder="Enter fee in lovelace"
            className={styles.inputField}
            style={{ fontSize: "1rem", padding: "0.75rem" }}
          />
        </div>
        <div
          className={styles.modalActions}
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "1rem",
            borderTop: "1px solid #ddd",
            paddingTop: "1rem",
          }}
        >
          <button
            onClick={onClose}
            className={styles.secondaryButton}
            style={{ fontSize: "1rem", padding: "0.6rem 1.2rem", borderRadius: "6px" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className={styles.primaryButton}
            style={{ fontSize: "1rem", padding: "0.6rem 1.2rem", borderRadius: "6px" }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
