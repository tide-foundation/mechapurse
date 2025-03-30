"use client";

import { JSX, useEffect, useState } from "react";
import {
  FaUsers,
  FaUserShield,
  FaCogs,
  FaTrash,
  FaPlus,
  FaEdit,
} from "react-icons/fa";
import { useRouter } from "next/navigation";
import {
  User,
  Role,
  RulesContainer,
  RuleSet,
  RuleDefinition,
  RuleCondition,
} from "@/interfaces/interface";
import styles from "@/styles/AdminDashboard.module.css";

// --- Constants for Rule Creation ---
const methods = [
  "LESS_THAN",
  "GREATER_THAN",
  "BETWEEN",
  "EQUAL_TO",
  "TOTAL_LESS_THAN",
  "FILTER_OUT_VALUES_EQUAL_TO",
  "FILTER_OUT_VALUES_NOT_EQUAL_TO",
];
const fields = [
  "Inputs.TxHash",
  "Inputs.TxIndex",
  "Outputs.Address",
  "Outputs.Amount",
  "Fee",
  "TTL",
];

// Default key if none exists
const DEFAULT_AUTH_KEY = "BlindSig:1";

export default function AdminDashboard() {
  const [view, setView] = useState("settings");
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState<Role | null>(null);
  const [globalSettings, setGlobalSettings] = useState<RulesContainer>({
    authorizationSettings: { [DEFAULT_AUTH_KEY]: { rules: [] } },
    validationSettings: {},
  });
  const [globalModalOpen, setGlobalModalOpen] = useState(false);
  const [currentKey, setCurrentKey] = useState<string | null>(null);
  const [globalSettingsType, setGlobalSettingsType] = useState<"authorization" | "validation">("authorization");

  const router = useRouter();

  useEffect(() => {
    if (view === "users") fetchUsers();
    if (view === "roles") fetchRoles();
    if (view === "settings") {
      fetchRoles(); // For validation settings reference
      fetchGlobalSettings();
    }
  }, [view]);

  // --- API Calls ---
  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/admin/roles");
      if (!res.ok) throw new Error("Failed to fetch roles");
      const data = await res.json();
      setRoles(data.roles);
    } catch (error) {
      console.error("Error fetching roles:", error);
    }
  };

  const fetchGlobalSettings = async () => {
    try {
      const res = await fetch("/api/admin/global-rules");
      if (res.ok) {
        const data = await res.json();
        setGlobalSettings(
          data || {
            authorizationSettings: { [DEFAULT_AUTH_KEY]: { rules: [] } },
            validationSettings: {},
          }
        );
      } else {
        setGlobalSettings({
          authorizationSettings: { [DEFAULT_AUTH_KEY]: { rules: [] } },
          validationSettings: {},
        });
      }
    } catch (error) {
      console.error("Error fetching global settings:", error);
    }
  };

  const saveGlobalSettings = async (updatedSettings: RulesContainer) => {
    try {
      const res = await fetch("/api/admin/global-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSettings),
      });
      if (!res.ok) throw new Error("Failed to save global settings");
      setGlobalModalOpen(false);
      setCurrentKey(null);
      fetchGlobalSettings();
    } catch (error) {
      console.error("Error saving global settings:", error);
    }
  };

  // --- Role CRUD ---
  const openAddRoleModal = () => {
    setRoleToEdit(null);
    setRoleModalOpen(true);
  };

  const openEditRoleModal = (role: Role) => {
    setRoleToEdit(role);
    setRoleModalOpen(true);
  };

  const saveRole = async (role: Partial<Role>) => {
    try {
      let res;
      if (roleToEdit) {
        res = await fetch(`/api/admin/roles/${roleToEdit.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(role),
        });
      } else {
        res = await fetch("/api/admin/roles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(role),
        });
      }
      if (!res.ok) throw new Error("Failed to save role");
      setRoleModalOpen(false);
      fetchRoles();
    } catch (error) {
      console.error("Error saving role:", error);
    }
  };

  const deleteRole = async (roleId: string) => {
    try {
      const res = await fetch(`/api/admin/roles/${roleId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete role");
      fetchRoles();
    } catch (error) {
      console.error("Error deleting role:", error);
    }
  };

  // --- Global Rules Modal Openers ---
  const openGlobalRulesForAuthorization = (key: string) => {
    setCurrentKey(key);
    setGlobalSettingsType("authorization");
    setGlobalModalOpen(true);
  };

  const openGlobalRulesForValidation = (roleKey: string) => {
    setCurrentKey(roleKey);
    setGlobalSettingsType("validation");
    setGlobalModalOpen(true);
  };

  return (
    <div className={styles.adminLayout}>
      {/* Sidebar */}
      <aside className={styles.adminSidebar}>
        <h1 className={styles.sidebarTitle}>Admin Panel</h1>
        <SidebarButton
          active={view === "settings"}
          onClick={() => setView("settings")}
          icon={<FaCogs />}
          text="Global Settings"
        />
        <SidebarButton
          active={view === "users"}
          onClick={() => setView("users")}
          icon={<FaUsers />}
          text="Manage Users"
        />
        <SidebarButton
          active={view === "roles"}
          onClick={() => setView("roles")}
          icon={<FaUserShield />}
          text="Manage Roles"
        />
      </aside>

      {/* Main Content */}
      <main className={styles.adminContent}>
        {view === "settings" && (
          <div className={styles.adminCard}>
            <h2 className={styles.cardTitle}>Global Settings</h2>
            <p className={styles.cardSubtitle}>
              Configure system-wide authorization and validation rules.
            </p>
            {/* Authorization Rules */}
            <section className={styles.section}>
              {globalSettings.authorizationSettings &&
                Object.entries(globalSettings.authorizationSettings).map(([key, ruleSet]) => (
                  <div key={key} className={styles.authorizationRuleset}>
                    <div className={styles.sectionHeader}>
                      <h3 className={styles.sectionTitle}>
                        Authorization Rules ({key})
                      </h3>
                      <div className={styles.thresholdInfo}>
                        <strong>Threshold:</strong>{" "}
                        {ruleSet.outputs?.threshold || "Not set"}
                      </div>
                    </div>
                    {ruleSet.rules && ruleSet.rules.length > 0 ? (
                      ruleSet.rules.map((rule, idx) => (
                        <div key={idx} className={styles.ruleItem}>
                          <div>
                            <strong>Field:</strong> {rule.field}
                          </div>
                          <div>
                            <strong>Method:</strong> {rule.conditions[0]?.method}
                          </div>
                          <div>
                            <strong>Values:</strong>{" "}
                            {(rule.conditions[0]?.values || []).join(", ")}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className={styles.emptyState}>
                        No authorization rules have been set for {key}.
                      </p>
                    )}
                    <button
                      onClick={() => openGlobalRulesForAuthorization(key)}
                      className={styles.primaryButton}
                    >
                      Edit Authorization Rules for {key}
                    </button>
                  </div>
                ))}
            </section>

            {/* Validation Rules */}
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Validation Rules</h3>
              </div>
              {roles.length > 0 ? (
                roles.map((role) => {
                  const roleKey =
                    role.clientRole && role.clientId
                      ? `resource_access.${role.clientId}.roles.${role.name}`
                      : `realm_access.roles.${role.name}`;
                  const ruleSet: RuleSet =
                    globalSettings.validationSettings[roleKey] || { rules: [] };

                  return (
                    <div key={role.id} className={styles.validationSection}>
                      <div className={styles.validationHeader}>
                        <strong className={styles.validationTitle}>{roleKey}</strong>
                        <button
                          onClick={() => openGlobalRulesForValidation(roleKey)}
                          className={styles.primaryButton}
                        >
                          Edit
                        </button>
                      </div>
                      {ruleSet.rules.length > 0 ? (
                        ruleSet.rules.map((r, idx) => (
                          <div key={idx} className={styles.ruleItem}>
                            <div>
                              <strong>Field:</strong> {r.field}
                            </div>
                            <div>
                              <strong>Method:</strong> {r.conditions[0]?.method}
                            </div>
                            <div>
                              <strong>Values:</strong>{" "}
                              {(r.conditions[0]?.values || []).join(", ")}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className={styles.emptyState}>
                          No validation rules set for this role.
                        </p>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className={styles.emptyState}>
                  No roles available to configure validation rules.
                </p>
              )}
            </section>
          </div>
        )}

        {view === "users" && (
          <div className={styles.adminCard}>
            <h2 className={styles.cardTitle}>Manage Users</h2>
            <p className={styles.cardSubtitle}>Review and manage user accounts.</p>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {view === "roles" && (
          <div className={styles.adminCard}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.cardTitle}>Manage Roles</h2>
              <button onClick={openAddRoleModal} className={styles.primaryButton}>
                <FaPlus /> Add Role
              </button>
            </div>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {roles.length === 0 ? (
                  <tr>
                    <td colSpan={3} className={styles.emptyState}>
                      No roles available.
                    </td>
                  </tr>
                ) : (
                  roles.map((role) => (
                    <tr key={role.id}>
                      <td>{role.name}</td>
                      <td>{role.description || "No description provided."}</td>
                      <td className={styles.actionsCell}>
                        <button
                          onClick={() => openEditRoleModal(role)}
                          className={styles.iconButton}
                          title="Edit Role"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => deleteRole(role.id)}
                          className={styles.iconButton}
                          title="Delete Role"
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Role Editor Modal */}
      {roleModalOpen && (
        <RoleModal
          role={roleToEdit}
          onClose={() => setRoleModalOpen(false)}
          onSave={saveRole}
        />
      )}

      {/* Global Settings Modal */}
      {globalModalOpen && currentKey && (
        <GlobalSettingsModalForRole
          roleKey={currentKey}
          settings={
            globalSettingsType === "authorization"
              ? globalSettings.authorizationSettings[currentKey] || { rules: [] }
              : globalSettings.validationSettings[currentKey] || { rules: [] }
          }
          onClose={() => {
            setGlobalModalOpen(false);
            setCurrentKey(null);
          }}
          onSave={(updatedRuleSet) =>
            saveGlobalSettings({
              authorizationSettings:
                globalSettingsType === "authorization"
                  ? {
                    ...globalSettings.authorizationSettings,
                    [currentKey]: updatedRuleSet,
                  }
                  : globalSettings.authorizationSettings,
              validationSettings:
                globalSettingsType === "validation"
                  ? {
                    ...globalSettings.validationSettings,
                    [currentKey]: updatedRuleSet,
                  }
                  : globalSettings.validationSettings,
            })
          }
          isAuthorization={globalSettingsType === "authorization"}
        />
      )}
    </div>
  );
}

/* --- Sidebar Button Component --- */
const SidebarButton = ({
  onClick,
  icon,
  text,
  active,
}: {
  onClick: () => void;
  icon: JSX.Element;
  text: string;
  active?: boolean;
}) => {
  return (
    <button onClick={onClick} className={`${styles.sidebarButton} ${active ? styles.active : ""}`}>
      {icon} <span>{text}</span>
    </button>
  );
};

/* --- Role Modal Component --- */
const RoleModal = ({
  role,
  onClose,
  onSave,
}: {
  role: Role | null;
  onClose: () => void;
  onSave: (role: Partial<Role>) => void;
}) => {
  const [name, setName] = useState(role?.name || "");
  const [description, setDescription] = useState(role?.description || "");
  const [isAuthorizer, setIsAuthorizer] = useState<boolean>(!!role?.isAuthorizer);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, description, isAuthorizer });
  };

  return (
    <div
      className={styles.modalOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="roleModalTitle"
    >
      <div className={styles.vaultlessCard}>
        <h3 id="roleModalTitle" className={styles.modalTitle}>
          {role ? "Edit Role" : "Add New Role"}
        </h3>
        <p className={styles.modalSubtitle}>
          Provide clear details so users know what permissions this role grants.
        </p>
        <form onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Role Name</label>
            <input
              type="text"
              className={styles.inputField}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Administrator"
              required
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Description</label>
            <textarea
              className={styles.inputField}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the role's responsibilities"
              rows={3}
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label}>
              <input
                type="checkbox"
                checked={isAuthorizer}
                onChange={(e) => setIsAuthorizer(e.target.checked)}
              />{" "}
              Is Authorizer Role?
            </label>
          </div>
          <div className={styles.modalActions}>
            <button type="button" onClick={onClose} className={styles.secondaryButton}>
              Cancel
            </button>
            <button type="submit" className={styles.primaryButton}>
              Save Role
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* --- Global Settings Modal for Role Component --- */
interface GlobalSettingsModalForRoleProps {
  roleKey: string;
  settings: RuleSet;
  onClose: () => void;
  onSave: (ruleSet: RuleSet) => void;
  isAuthorization?: boolean;
}

const GlobalSettingsModalForRole = ({
  roleKey,
  settings,
  onClose,
  onSave,
  isAuthorization = false,
}: GlobalSettingsModalForRoleProps) => {
  const [localRuleSet, setLocalRuleSet] = useState<RuleSet>(settings);

  const updateRuleField = (index: number, fieldValue: string) => {
    const newRules = [...localRuleSet.rules];
    newRules[index] = { ...newRules[index], field: fieldValue };
    setLocalRuleSet({ ...localRuleSet, rules: newRules });
  };

  const updateConditionField = (
    ruleIndex: number,
    condIndex: number,
    field: keyof RuleCondition,
    value: any
  ) => {
    const newRules = [...localRuleSet.rules];
    const rule = newRules[ruleIndex];
    const updatedConditions = [...rule.conditions];
    updatedConditions[condIndex] = { ...updatedConditions[condIndex], [field]: value };
    newRules[ruleIndex] = { ...rule, conditions: updatedConditions };
    setLocalRuleSet({ ...localRuleSet, rules: newRules });
  };

  const addConditionToRule = (ruleIndex: number) => {
    const newRules = [...localRuleSet.rules];
    newRules[ruleIndex] = {
      ...newRules[ruleIndex],
      conditions: [
        ...newRules[ruleIndex].conditions,
        { method: methods[0], values: [""] },
      ],
    };
    setLocalRuleSet({ ...localRuleSet, rules: newRules });
  };

  const removeConditionFromRule = (ruleIndex: number, condIndex: number) => {
    const newRules = [...localRuleSet.rules];
    const updatedConditions = [...newRules[ruleIndex].conditions];
    updatedConditions.splice(condIndex, 1);
    newRules[ruleIndex] = { ...newRules[ruleIndex], conditions: updatedConditions };
    setLocalRuleSet({ ...localRuleSet, rules: newRules });
  };

  const addRule = () => {
    const newRule: RuleDefinition = {
      ruleId: undefined,
      field: fields[0],
      conditions: [{ method: methods[0], values: [""] }],
      aud: isAuthorization ? "model" : "user",
    };
    setLocalRuleSet({ ...localRuleSet, rules: [...localRuleSet.rules, newRule] });
  };

  const removeRule = (index: number) => {
    const newRules = localRuleSet.rules.filter((_, i) => i !== index);
    setLocalRuleSet({ ...localRuleSet, rules: newRules });
  };

  const handleSave = () => {
    const updatedRuleSet = isAuthorization
      ? { ...localRuleSet, ruleSetId: "threshold_rule" }
      : localRuleSet;
    const { ruleSetId, ...rest } = updatedRuleSet;
    onSave({ ruleSetId, ...rest });
  };

  return (
    <div
      className={styles.modalOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="globalRulesModalTitle"
    >
      <div className={styles.vaultlessCardLarge}>
        <h3 id="globalRulesModalTitle" className={styles.modalTitle}>
          Edit Global Rules for <strong>{roleKey}</strong>
        </h3>
        <p className={styles.modalSubtitle}>
          Configure the rules that affect this role’s access.
        </p>
        {isAuthorization && (
          <div className={styles.inputGroup}>
            <label className={styles.label}>Required User Approvals</label>
            <input
              type="number"
              value={localRuleSet.outputs?.threshold || ""}
              onChange={(e) =>
                setLocalRuleSet({
                  ...localRuleSet,
                  outputs: { threshold: Number(e.target.value) },
                })
              }
              className={styles.inputField}
              placeholder="e.g., 3"
            />
          </div>
        )}
        <div className={styles.rulesEditor}>
          {localRuleSet.rules.map((rule, index) => (
            <div key={index} className={styles.ruleEditor}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Field</label>
                <select
                  value={rule.field}
                  onChange={(e) => updateRuleField(index, e.target.value)}
                  className={styles.inputField}
                >
                  {fields.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              {rule.conditions.map((condition, condIndex) => (
                <div key={condIndex} className={styles.conditionEditor}>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Method</label>
                    <select
                      value={condition.method}
                      onChange={(e) =>
                        updateConditionField(index, condIndex, "method", e.target.value)
                      }
                      className={styles.inputField}
                    >
                      {methods.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.inputGroup}>
                    {condition.method === "BETWEEN" ? (
                      <div className={styles.betweenInputs}>
                        <input
                          className={styles.inputField}
                          value={condition.values[0]}
                          onChange={(e) =>
                            updateConditionField(index, condIndex, "values", [
                              e.target.value,
                              condition.values[1],
                            ])
                          }
                          placeholder="Min"
                        />
                        <input
                          className={styles.inputField}
                          value={condition.values[1]}
                          onChange={(e) =>
                            updateConditionField(index, condIndex, "values", [
                              condition.values[0],
                              e.target.value,
                            ])
                          }
                          placeholder="Max"
                        />
                      </div>
                    ) : (
                      <input
                        className={styles.inputField}
                        value={condition.values[0]}
                        onChange={(e) =>
                          updateConditionField(index, condIndex, "values", [e.target.value])
                        }
                        placeholder="Value"
                      />
                    )}
                  </div>
                  <button
                    onClick={() => removeConditionFromRule(index, condIndex)}
                    className={styles.secondaryButton}
                  >
                    Remove Condition
                  </button>
                </div>
              ))}
              <button onClick={() => addConditionToRule(index)} className={styles.primaryButton}>
                + Add Condition
              </button>
              <button onClick={() => removeRule(index)} className={styles.secondaryButton}>
                Delete Rule
              </button>
            </div>
          ))}
          <button onClick={addRule} className={styles.primaryButton}>
            <FaPlus /> Add Rule
          </button>
        </div>
        <div className={styles.modalActions}>
          <button onClick={onClose} className={styles.secondaryButton}>
            Cancel
          </button>
          <button onClick={handleSave} className={styles.primaryButton}>
            Save Global Rules
          </button>
        </div>
      </div>
    </div>
  );
};
