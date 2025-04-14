import { RuleSet } from "@/interfaces/interface";
import { useState } from "react";
import { FaChevronRight, FaEdit, FaTrash } from "react-icons/fa";
import styles from "@/styles/AdminDashboard.module.css";

interface RuleSetCardProps {
  ruleSet: RuleSet;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}

export const RuleSetCard = ({ ruleSet, index, onEdit, onDelete }: RuleSetCardProps) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className={styles.ruleSetCard}>
      <div className={styles.cardHeader}>
        <button
          onClick={() => setExpanded(!expanded)}
          className={styles.ruleSetExpandButton}
          title="Toggle Rule Set Details"
        >
          <FaChevronRight className={expanded ? styles.iconRotated : ""} />
        </button>
        <span className={styles.ruleSetTitle}>Rule Set {index + 1}</span>
        <button onClick={onEdit} className={styles.editButton} title="Edit Rule Set">
          <FaEdit />
        </button>
        <button onClick={onDelete} className={styles.editButton} title="Delete Rule Set">
          <FaTrash />
        </button>
      </div>
      {expanded && (
        <div className={styles.cardContent}>
          {ruleSet.outputs && ruleSet.outputs.threshold !== undefined && (
            <div className={styles.thresholdInfo}>
              <strong className={styles.thresholdLabel}>Threshold:</strong>{" "}
              <span className={styles.thresholdValue}>{ruleSet.outputs.threshold}</span>
            </div>
          )}
          {ruleSet.rules && ruleSet.rules.length > 0 ? (
            ruleSet.rules.map((rule, idx) => (
              <div key={idx} className={styles.ruleItem}>
                <div>
                  <strong>Field:</strong> {rule.field}
                </div>
                {rule.conditions && rule.conditions.length > 0 ? (
                  <div className={styles.conditionsWrapper}>
                {rule.conditions.map((cond, cIdx) => (
                  <div key={cIdx} className={styles.conditionItem}>
                    <div>
                      <strong>Method:</strong> {cond.method}
                    </div>
                    <div>
                      <strong>Values:</strong> {(cond.values || []).join(", ")}
                      {rule.field === "Outputs.Amount" && (<span className={styles.unitBadge}>lovelace</span>)}
                    </div>
                  </div>
                ))}
              </div>
                ) : (
                  <div className={styles.noConditions}>No conditions provided.</div>
                )}
              </div>
            ))
          ) : (
            <p className={styles.emptyState}>No rules in this rule set.</p>
          )}
        </div>
      )}
    </div>
  );
};
