"use client";
import { useState, useEffect } from "react";
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

export default function SimpleGlobalSettingsModal({
  roleKey,
  settings,
  onClose,
  onSave,
  isThreshold,
}: SimpleGlobalSettingsModalProps) {
  const { walletAddressHex } = useAuth();

  // Local state for each input field
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [maxFee, setMaxFee] = useState("");
  const [threshold, setThreshold] = useState("");

  // Pre-populate input values from existing settings when editing
  useEffect(() => {
    if (settings && settings.rules) {
      // Find the rule for "Outputs.Amount"
      const amountRule = settings.rules.find(rule => rule.field === "Outputs.Amount");
      if (amountRule && amountRule.conditions?.length) {
        // Look for the min and max condition values
        const minCondition = amountRule.conditions.find(cond => cond.method === "TOTAL_MORE_THAN");
        const maxCondition = amountRule.conditions.find(cond => cond.method === "TOTAL_LESS_THAN");
        if (minCondition && minCondition.values?.[0]) {
          // Convert lovelaces to ADA (1 ADA = 1,000,000 lovelaces)
          setMinAmount((Number(minCondition.values[0]) / 1_000_000).toString());
        }
        if (maxCondition && maxCondition.values?.[0]) {
          setMaxAmount((Number(maxCondition.values[0]) / 1_000_000).toString());
        }
      }

      // Check if there is a fee rule defined
      const feeRule = settings.rules.find(rule => rule.field === "Fee");
      if (feeRule && feeRule.conditions?.length) {
        const feeCondition = feeRule.conditions.find(cond => cond.method === "LESS_THAN");
        if (feeCondition && feeCondition.values?.[0]) {
          setMaxFee(feeCondition.values[0]);
        }
      }
    }
    // For roles other than the global threshold, pre-fill the threshold if available.
    if (roleKey !== DEFAULT_THRESHOLD_KEY && settings.outputs && settings.outputs.threshold) {
      setThreshold(settings.outputs.threshold.toString());
    }
  }, [settings, roleKey]);

  // Build a new RuleSet from the input values when saving
  const handleSave = () => {
    const rules: RuleDefinition[] = [];
    const amountConditions: RuleCondition[] = [];
    const minAmountNumber = Number(minAmount);
    const maxAmountNumber = Number(maxAmount);

    if (minAmount && !isNaN(minAmountNumber)) {
      amountConditions.push({
        method: "TOTAL_MORE_THAN",
        values: [(minAmountNumber * 1_000_000).toString()],
      });
    }
    if (maxAmount && !isNaN(maxAmountNumber)) {
      amountConditions.push({
        method: "TOTAL_LESS_THAN",
        values: [(maxAmountNumber * 1_000_000).toString()],
      });
    }
    if (amountConditions.length > 0) {
      rules.push({
        ruleId: undefined,
        field: "Outputs.Amount",
        conditions: amountConditions,
      });
    }
    // Always add the exclusion rule for the wallet address
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
            marginBottom: "1rem",
            wordWrap: "break-word",
          }}
        >
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
        ></p>
        <div className={styles.inputGroup}>
          <label
            className={styles.label}
            style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.5rem" }}
          >
            Minimum Allowed Amount (1 ada = 1000000 lovelace)
          </label>
          <input
            type="number"
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
            placeholder="Enter ADA amount"
            className={styles.inputField}
            style={{ fontSize: "1rem", padding: "0.75rem" }}
          />
        </div>
        <div className={styles.inputGroup}>
          <label
            className={styles.label}
            style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.5rem" }}
          >
            Maximum Allowed Amount (1 ada = 1000000 lovelace)
          </label>
          <input
            type="number"
            value={maxAmount}
            onChange={(e) => setMaxAmount(e.target.value)}
            placeholder="Enter ADA amount"
            className={styles.inputField}
            style={{ fontSize: "1rem", padding: "0.75rem" }}
          />
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
            placeholder="e.g., 50000"
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
