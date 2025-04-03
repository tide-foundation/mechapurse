"use client";

import { JSX, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  FaCogs,
  FaTrash,
  FaPlus,
  FaEdit,
  FaChevronRight,
  FaSave,
  FaUndo,
  FaListAlt,
} from "react-icons/fa";
import { useRouter } from "next/router";
import {
  User,
  Role,
  RuleSettings,
  RuleSet,
  RuleDefinition,
  RuleCondition,
} from "@/interfaces/interface";
import styles from "@/styles/AdminDashboard.module.css";
import { Heimdall } from "@/tide-modules/modules/heimdall";
import { useAuth } from "@/components/AuthContext";
import { addRuleSettingDraftRequest, createAuthorization } from "@/app/utils/helperMethods";
import { RuleSetCard } from "@/components/admin/RuleSetCard";
import UserModal from "@/components/admin/UserModal";
import { ChangeSetRequest } from "@/lib/keycloakTypes";

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

// Reserved key for the threshold (global) rules.
const DEFAULT_THRESHOLD_KEY = "CardanoTx:1.BlindSig:1";

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
 * DRAFT → grey, PENDING → orange, APPROVE → green.
 */
function getStatusBadge(status: string) {
  let backgroundColor = "#ccc"; // default for DRAFT
  if (status === "PENDING") backgroundColor = "#ffa500";
  else if (status === "APPROVE") backgroundColor = "#4caf50";
  return (
    <span
      style={{
        backgroundColor,
        color: "#fff",
        padding: "0.3rem 0.6rem",
        borderRadius: "4px",
        fontWeight: "bold",
      }}
    >
      {status}
    </span>
  );
}

// --- Modal Wrapper ---
const ModalWrapper = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
};

// --- Collapsible Section Component ---
interface CollapsibleSectionProps {
  title: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}
const CollapsibleSection = ({
  title,
  expanded,
  onToggle,
  headerActions,
  children,
}: CollapsibleSectionProps) => {
  return (
    <div className={styles.collapsibleSection}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionHeaderLeft}>
          <button onClick={onToggle} className={styles.expandButton} title="Toggle Expand/Collapse">
            <FaChevronRight className={expanded ? styles.iconRotated : ""} />
          </button>
          {typeof title === "string" ? <h3 className={styles.sectionTitle}>{title}</h3> : title}
        </div>
        {headerActions && headerActions}
      </div>
      <div className={`${styles.collapsibleContent} ${expanded ? styles.expanded : styles.collapsed}`}>
        {children}
      </div>
    </div>
  );
};

// --- Interfaces for Change Requests ---
interface ChangeRequest {
  id: string;
  type: "user" | "rules";
  description: string;
  requestedBy: string;
  date: string;
  // For user change requests:
  userRecord?: UserChangeRecord[];
  // For rules change requests, additional properties (e.g. newData or validationSettings) are expected.
  status?: string;
  role?: string;
  [key: string]: any;
}

interface UserChangeRecord {
  username: string;
  clientId: string;
  proofDetailId: string;
  accessDraft: string;
}

// --- Component: UserRecordCard ---
// Renders one user record as a fixed detail card.
const UserRecordCard = ({ record }: { record: UserChangeRecord }) => {
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
      <p style={{ margin: "0 0 0.3rem" }}><strong>Username:</strong> {record.username}</p>
      <p style={{ margin: 0 }}><strong>Client ID:</strong> {record.clientId}</p>
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
        <pre style={{ fontSize: "0.9rem", whiteSpace: "pre-wrap", wordWrap: "break-word", margin: 0 }}>
          {JSON.stringify(safeParseJSON(record.accessDraft), null, 2)}
        </pre>
      </div>
    </div>
  );
};

// --- Component: UserChangeRequestCard ---
// Renders a user-type change request with a header row and a collapsible container
// wrapping the list of user records.
const UserChangeRequestCard = ({
  changeRequest,
  onProceed,
}: {
  changeRequest: ChangeRequest;
  onProceed: () => void;
}) => {
  const records: UserChangeRecord[] = changeRequest.userRecord || [];
  const [recordsExpanded, setRecordsExpanded] = useState(false);
  return (
    <div
      className={styles.changeRequestCard}
      style={{ border: "1px solid #ccc", padding: "1rem", marginBottom: "1rem" }}
    >
      {/* Header Row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
          flexWrap: "wrap",
        }}
      >
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
        <div>
          <button onClick={onProceed} className={styles.primaryButton}   style={{ width: "150px", display: "flex", justifyContent: "center", alignItems: "center" }}
          >
            Review
          </button>
        </div>
      </div>
      {/* Collapsible Container for User Records */}
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


// --- Component: RulesChangeRequestCard ---
// Renders a rules-type change request card with a similar design to Users.
// It includes a header row with action, status, and role; a button to toggle the detail container;
// and the detail container (collapsed by default) shows the new JSON details.
const RulesChangeRequestCard = ({
  changeRequest,
  onProceed,
}: {
  changeRequest: ChangeRequest;
  onProceed: () => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const newData = safeParseJSON(changeRequest.newData || changeRequest.validationSettings || {});
  return (
    <div className={styles.changeRequestCard} style={{ border: "1px solid #ccc", padding: "1rem", marginBottom: "1rem" }}>
      {/* Header Row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <div><strong>Action:</strong> {changeRequest.action || "N/A"}</div>
          <div><strong>Status:</strong> {getStatusBadge(changeRequest.status || "DRAFT")}</div>
          <div><strong>Role:</strong> {changeRequest.role || "N/A"}</div>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <button onClick={() => setExpanded(!expanded)} className={styles.secondaryButton}>
            {expanded ? "Hide Details" : "Show Details"}
          </button>
          <button onClick={onProceed} className={styles.primaryButton}  style={{ width: "150px", display: "flex", justifyContent: "center", alignItems: "center" }}
          >
            Review
          </button>
        </div>
      </div>
      {/* Collapsible Detail Container */}
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

// --- Placeholder for External Review Popup ---
const openExternalReviewPopup = (cr: ChangeRequest) => {
  console.log("Opening external review popup for:", cr);
  // Replace with your actual integration.
};

export default function AdminDashboard() {
  const { vuid, createRuleSettingsDraft, signRuleSettingsDraft } = useAuth();
  const [view, setView] = useState("settings");
  const [activeTab, setActiveTab] = useState("user"); // "user" or "rules"

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [allRoles, setAllRoles] = useState<Role[]>([]);

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState<Role | null>(null);

  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);

  const [globalSettings, setGlobalSettings] = useState<RuleSettings>({
    id: "",
    validationSettings: { [DEFAULT_THRESHOLD_KEY]: [{ rules: [] }] },
  });
  const [globalModalOpen, setGlobalModalOpen] = useState(false);
  const [currentKey, setCurrentKey] = useState<string | null>(null);
  const [currentRuleSetIndex, setCurrentRuleSetIndex] = useState<number | null>(null);
  const [globalSettingsType, setGlobalSettingsType] = useState<"threshold" | "validation">("validation");
  const [isNewRuleSet, setIsNewRuleSet] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<{ [key: string]: boolean }>({});

  const [userChangeRequests, setUserChangeRequests] = useState<ChangeRequest[]>([]);
  const [rulesChangeRequests, setRulesChangeRequests] = useState<ChangeRequest[]>([]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (unsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [unsavedChanges]);

  const navigateTo = (newView: string) => {
    if (unsavedChanges && !window.confirm("You have unsaved changes. Are you sure you want to leave?")) {
      return;
    }
    setUnsavedChanges(false);
    setView(newView);
  };

  useEffect(() => {
    if (view === "users") {
      fetchUsers();
      fetchAllRoles();
    }
    if (view === "roles") fetchRoles();
    if (view === "settings") {
      fetchRoles();
      fetchGlobalSettings();
    }
    if (view === "changeRequests") {
      fetchUserChangeRequests();
      fetchRulesChangeRequests();
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

  const fetchAllRoles = async () => {
    try {
      const res = await fetch("/api/admin/roles/all");
      if (!res.ok) throw new Error("Failed to fetch roles");
      const data = await res.json();
      setAllRoles(data.roles);
    } catch (error) {
      console.error("Error fetching roles:", error);
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
        if (
          !data.validationSettings ||
          !data.validationSettings[DEFAULT_THRESHOLD_KEY] ||
          data.validationSettings[DEFAULT_THRESHOLD_KEY].length === 0
        ) {
          data.validationSettings = {
            ...data.validationSettings,
            [DEFAULT_THRESHOLD_KEY]: [{ rules: [] }],
          };
        }
        setGlobalSettings(data || { id: "", validationSettings: { [DEFAULT_THRESHOLD_KEY]: [{ rules: [] }] } });
        const newExpanded: { [key: string]: boolean } = {};
        Object.keys(data.validationSettings || {}).forEach((key) => {
          newExpanded[key] = true;
        });
        setExpandedKeys(newExpanded);
      } else {
        setGlobalSettings({ id: "", validationSettings: { [DEFAULT_THRESHOLD_KEY]: [{ rules: [] }] } });
      }
    } catch (error) {
      console.error("Error fetching global settings:", error);
    }
  };

  const fetchUserChangeRequests = async () => {
    try {
      const res = await fetch("/api/admin/change-requests/users");
      if (!res.ok) throw new Error("Failed to fetch user change requests");
      const data = await res.json();
      setUserChangeRequests(data.settings);
    } catch (error) {
      console.error("Error fetching user change requests:", error);
    }
  };

  const fetchRulesChangeRequests = async () => {
    try {
      const res = await fetch("/api/admin/change-requests/rules");
      if (!res.ok) throw new Error("Failed to fetch rules change requests");
      const data = await res.json();
      setRulesChangeRequests(data);
    } catch (error) {
      console.error("Error fetching rules change requests:", error);
    }
  };

  const saveGlobalSettings = async (updatedSettings: RuleSettings) => {
    try {
      const res = await fetch("/api/admin/global-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSettings),
      });
      if (!res.ok) throw new Error("Failed to save global settings");

      const reqDraft = await res.json();
      const heimdall = new Heimdall(reqDraft.uri, [vuid]);
      const draft = createRuleSettingsDraft(
        reqDraft.settings,
        reqDraft.previousRuleSetting,
        reqDraft.previousRuleSettingCert
      );
      const draftReq = await addRuleSettingDraftRequest(draft);
      if (draftReq === null) {
        throw new Error("No rule sign draft req");
      }
      await heimdall.openEnclave();

      const authApproval = await heimdall.getAuthorizerApproval(draft, "Rules:1", draftReq.expiry, "base64");

      if (authApproval.accepted === true) {
        const authzAuthn = await heimdall.getAuthorizerAuthentication();
        heimdall.closeEnclave();
        const data = await createAuthorization(authApproval.data, authzAuthn, "rules");
        if (!isNaN(Number(reqDraft.threshold)) && Number(reqDraft.threshold) === 1) {
          const res = await fetch("/api/admin/global-rules/saveAndSign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ruleDraft: draftReq.ruleReqDraft,
              authorizations: [data.authorization],
              expiry: draftReq.expiry,
              newSetting: reqDraft.settings,
            }),
          });
          if (!res.ok) throw new Error("Failed to save global settings");
        }
      }
      setUnsavedChanges(false);
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

  // --- User Editing ---
  const openEditUserModal = (user: User) => {
    setUserToEdit(user);
    setUserModalOpen(true);
  };

  const updateUser = async (user: User, updatedUser: Partial<User>) => {
    try {
      if (user.name !== updatedUser.name || user.email !== updatedUser.email) {
        const res = await fetch(`/api/admin/users`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedUser),
        });
        if (!res.ok) throw new Error("Failed to update user");
      }
      if (user.role !== updatedUser.role) {
        const res = await fetch(`/api/admin/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedUser),
        });
        if (!res.ok) throw new Error("Failed to update user");
      }
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };

  // --- Global Rules Modal Openers ---
  const openGlobalRulesForModal = (key: string, ruleSetIndex: number | null) => {
    setCurrentKey(key);
    setCurrentRuleSetIndex(ruleSetIndex);
    setGlobalSettingsType(key === DEFAULT_THRESHOLD_KEY ? "threshold" : "validation");
    setIsNewRuleSet(ruleSetIndex === null);
    setGlobalModalOpen(true);
  };

  const handleRuleSetDelete = (key: string, index: number) => {
    if (window.confirm("Are you sure you want to remove this rule set?")) {
      const updatedValidationSettings = { ...globalSettings.validationSettings };
      const currentArray = updatedValidationSettings[key] || [];
      updatedValidationSettings[key] = currentArray.filter((_, i) => i !== index);
      setGlobalSettings({ ...globalSettings, validationSettings: updatedValidationSettings });
      setUnsavedChanges(true);
    }
  };

  const handleModalSave = (updatedRuleSet: RuleSet) => {
    if (globalSettingsType === "threshold") {
      const updatedValidationSettings = { ...globalSettings.validationSettings };
      const currentArray = updatedValidationSettings[DEFAULT_THRESHOLD_KEY] || [];
      if (isNewRuleSet) {
        updatedValidationSettings[DEFAULT_THRESHOLD_KEY] = [...currentArray, updatedRuleSet];
      } else {
        updatedValidationSettings[DEFAULT_THRESHOLD_KEY] = currentArray.map((rs, idx) =>
          idx === currentRuleSetIndex ? updatedRuleSet : rs
        );
      }
      setGlobalSettings({ ...globalSettings, validationSettings: updatedValidationSettings });
    } else {
      const updatedValidationSettings = { ...globalSettings.validationSettings };
      const currentArray = updatedValidationSettings[currentKey!] || [];
      if (isNewRuleSet) {
        updatedValidationSettings[currentKey!] = [...currentArray, updatedRuleSet];
      } else {
        updatedValidationSettings[currentKey!] = currentArray.map((rs, idx) =>
          idx === currentRuleSetIndex ? updatedRuleSet : rs
        );
      }
      setGlobalSettings({ ...globalSettings, validationSettings: updatedValidationSettings });
    }
    setUnsavedChanges(true);
    setGlobalModalOpen(false);
    setCurrentKey(null);
    setCurrentRuleSetIndex(null);
    setIsNewRuleSet(false);
  };

  const handleGlobalSave = async () => {
    await saveGlobalSettings(globalSettings);
  };

  const handleRevertChanges = () => {
    fetchGlobalSettings();
    setUnsavedChanges(false);
  };

  const toggleKeyExpansion = (key: string) => {
    setExpandedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const reviewChangeRequest = (cr: ChangeRequest) => {
    openExternalReviewPopup(cr);
  };

  return (
    <div className={styles.adminLayout}>
      {/* Sidebar */}
      <aside className={styles.adminSidebar}>
        <h1 className={styles.sidebarTitle}>Admin Panel</h1>
        <SidebarButton
          active={view === "settings"}
          onClick={() => navigateTo("settings")}
          icon={<FaCogs />}
          text="Global Settings"
        />
        <SidebarButton
          active={view === "users"}
          onClick={() => navigateTo("users")}
          icon={<FaCogs />}
          text="Manage Users"
        />
        <SidebarButton
          active={view === "roles"}
          onClick={() => navigateTo("roles")}
          icon={<FaCogs />}
          text="Manage Roles"
        />
        <SidebarButton
          active={view === "changeRequests"}
          onClick={() => navigateTo("changeRequests")}
          icon={<FaListAlt />}
          text="Change Requests"
        />
      </aside>

      {/* Main Content */}
      <main className={styles.adminContent}>
        {view === "settings" && (
          <div className={styles.adminCard}>
            <h2 className={styles.cardTitle}>Global Settings</h2>
            <p className={styles.cardSubtitle}>
              Configure system-wide threshold and role-based validation rules.
            </p>
            <CollapsibleSection
              title={`Global Threshold (Key: ${DEFAULT_THRESHOLD_KEY})`}
              expanded={!!expandedKeys[DEFAULT_THRESHOLD_KEY]}
              onToggle={() => toggleKeyExpansion(DEFAULT_THRESHOLD_KEY)}
              headerActions={
                <button onClick={() => openGlobalRulesForModal(DEFAULT_THRESHOLD_KEY, null)} className={styles.primaryButton}>
                  <FaPlus /> Add Rule Set
                </button>
              }
            >
              <div className={styles.ruleSetsList}>
                {globalSettings.validationSettings &&
                  globalSettings.validationSettings[DEFAULT_THRESHOLD_KEY] &&
                  globalSettings.validationSettings[DEFAULT_THRESHOLD_KEY].map((ruleSet, index) => (
                    <RuleSetCard
                      key={index}
                      ruleSet={ruleSet}
                      index={index}
                      onEdit={() => openGlobalRulesForModal(DEFAULT_THRESHOLD_KEY, index)}
                      onDelete={() => handleRuleSetDelete(DEFAULT_THRESHOLD_KEY, index)}
                    />
                  ))}
              </div>
            </CollapsibleSection>
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Role-Based Validation Rules</h3>
              {roles.length > 0 ? (
                roles.map((role) => {
                  const roleKey =
                    role.clientRole && role.clientId
                      ? `resource_access.${role.clientId}.roles.${role.name}`
                      : `realm_access.roles.${role.name}`;
                  const ruleSets: RuleSet[] = globalSettings.validationSettings[roleKey] || [];
                  return (
                    <CollapsibleSection
                      key={role.id}
                      title={<strong className={styles.validationTitle}>{roleKey}</strong>}
                      expanded={!!expandedKeys[roleKey]}
                      onToggle={() => toggleKeyExpansion(roleKey)}
                      headerActions={
                        <button onClick={() => openGlobalRulesForModal(roleKey, null)} className={styles.primaryButton}>
                          <FaPlus /> Add Rule Set
                        </button>
                      }
                    >
                      {ruleSets.length > 0 ? (
                        ruleSets.map((rs, index) => (
                          <RuleSetCard
                            key={index}
                            ruleSet={rs}
                            index={index}
                            onEdit={() => openGlobalRulesForModal(roleKey, index)}
                            onDelete={() => handleRuleSetDelete(roleKey, index)}
                          />
                        ))
                      ) : (
                        <p className={styles.emptyState}>No validation rules set for this role.</p>
                      )}
                    </CollapsibleSection>
                  );
                })
              ) : (
                <p className={styles.emptyState}>No roles available to configure validation rules.</p>
              )}
            </section>
            {unsavedChanges && (
              <div className={styles.saveActionsContainer}>
                <button onClick={handleRevertChanges} className={styles.secondaryButton}>
                  <FaUndo /> Discard Changes
                </button>
                <button onClick={handleGlobalSave} className={styles.primaryButton}>
                  <FaSave /> Save Changes
                </button>
              </div>
            )}
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
                  <th>Roles</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} onClick={() => openEditUserModal(user)} style={{ cursor: "pointer" }}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{Array.isArray(user.role) ? user.role.join(", ") : user.role}</td>
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
                        <button onClick={() => openEditRoleModal(role)} className={styles.iconButton} title="Edit Role">
                          <FaEdit />
                        </button>
                        <button onClick={() => deleteRole(role.id)} className={styles.iconButton} title="Delete Role">
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

        {view === "changeRequests" && (
          <div className={styles.adminCard}>
            <div className={styles.changeRequestsHeader} style={{ marginBottom: "1rem" }}>
              <h2 className={styles.cardTitle}>Change Requests</h2>
              {/* Horizontal tab header (no icons) */}
              <div className={styles.pfTabs} style={{ display: "flex", borderBottom: "2px solid #e0e0e0" }}>
                <button
                  onClick={() => setActiveTab("user")}
                  className={activeTab === "user" ? styles.activeTab : styles.tab}
                  style={{
                    flex: 1,
                    padding: "1rem",
                    fontSize: "1.2rem",
                    border: "none",
                    borderBottom: activeTab === "user" ? "3px solid #007bba" : "3px solid transparent",
                    backgroundColor: activeTab === "user" ? "#e0f7ff" : "transparent",
                    cursor: "pointer",
                  }}
                >
                  Users ({userChangeRequests.length})
                </button>
                <button
                  onClick={() => setActiveTab("rules")}
                  className={activeTab === "rules" ? styles.activeTab : styles.tab}
                  style={{
                    flex: 1,
                    padding: "1rem",
                    fontSize: "1.2rem",
                    border: "none",
                    borderBottom: activeTab === "rules" ? "3px solid #007bba" : "3px solid transparent",
                    backgroundColor: activeTab === "rules" ? "#e0f7ff" : "transparent",
                    cursor: "pointer",
                  }}
                >
                  Rules ({rulesChangeRequests.length})
                </button>
              </div>
            </div>
            <div className={styles.tabContent}>
              {activeTab === "user" ? (
                userChangeRequests.length > 0 ? (
                  userChangeRequests.map((cr) => (
                    <UserChangeRequestCard key={cr.id} changeRequest={cr} onProceed={() => reviewChangeRequest(cr)} />
                  ))
                ) : (
                  <p className={styles.emptyState}>No user change requests pending.</p>
                )
              ) : rulesChangeRequests.length > 0 ? (
                rulesChangeRequests.map((cr) => (
                  <RulesChangeRequestCard key={cr.id} changeRequest={cr} onProceed={() => reviewChangeRequest(cr)} />
                ))
              ) : (
                <p className={styles.emptyState}>No rules change requests pending.</p>
              )}
            </div>
          </div>
        )}
      </main>

      {roleModalOpen && (
        <ModalWrapper>
          <RoleModal role={roleToEdit} onClose={() => setRoleModalOpen(false)} onSave={saveRole} />
        </ModalWrapper>
      )}
      {userModalOpen && userToEdit && (
        <ModalWrapper>
          <UserModal
            user={userToEdit}
            roles={allRoles}
            onClose={() => setUserModalOpen(false)}
            onSave={async (updatedUser: Partial<User>) => {
              await updateUser(userToEdit, updatedUser);
              setUserModalOpen(false);
              fetchUsers();
            }}
          />
        </ModalWrapper>
      )}
      {globalModalOpen && currentKey && (
        <ModalWrapper>
          <GlobalSettingsModalForRole
            roleKey={currentKey}
            settings={
              globalSettingsType === "threshold"
                ? (globalSettings.validationSettings[DEFAULT_THRESHOLD_KEY] &&
                    (currentRuleSetIndex !== null
                      ? globalSettings.validationSettings[DEFAULT_THRESHOLD_KEY][currentRuleSetIndex]
                      : { rules: [] })) || { rules: [] }
                : (globalSettings.validationSettings[currentKey] &&
                    (currentRuleSetIndex !== null
                      ? globalSettings.validationSettings[currentKey][currentRuleSetIndex]
                      : { rules: [] })) || { rules: [] }
            }
            onClose={() => {
              setGlobalModalOpen(false);
              setCurrentKey(null);
              setCurrentRuleSetIndex(null);
              setIsNewRuleSet(false);
            }}
            onSave={handleModalSave}
            isThreshold={globalSettingsType === "threshold"}
          />
        </ModalWrapper>
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
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="roleModalTitle">
      <div className={styles.appCard}>
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
              <input type="checkbox" checked={isAuthorizer} onChange={(e) => setIsAuthorizer(e.target.checked)} />{" "}
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
  isThreshold: boolean;
}
const GlobalSettingsModalForRole = ({
  roleKey,
  settings,
  onClose,
  onSave,
  isThreshold,
}: GlobalSettingsModalForRoleProps) => {
  const [localRuleSet, setLocalRuleSet] = useState<RuleSet>(settings);

  const updateRuleField = (index: number, fieldValue: string) => {
    const newRules = [...localRuleSet.rules];
    newRules[index] = { ...newRules[index], field: fieldValue };
    setLocalRuleSet({ ...localRuleSet, rules: newRules });
  };

  const updateConditionField = (ruleIndex: number, condIndex: number, field: keyof RuleCondition, value: any) => {
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
      conditions: [...newRules[ruleIndex].conditions, { method: methods[0], values: [""] }],
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
    };
    setLocalRuleSet({ ...localRuleSet, rules: [...localRuleSet.rules, newRule] });
  };

  const removeRule = (index: number) => {
    const newRules = localRuleSet.rules.filter((_, i) => i !== index);
    setLocalRuleSet({ ...localRuleSet, rules: newRules });
  };

  const handleSave = () => {
    const updatedRuleSet = isThreshold ? { ...localRuleSet, ruleSetId: "threshold_rule" } : localRuleSet;
    const { ruleSetId, ...rest } = updatedRuleSet;
    onSave({ ruleSetId, ...rest });
  };

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="globalRulesModalTitle">
      <div className={styles.appCardLarge}>
        <h3 id="globalRulesModalTitle" className={styles.modalTitle}>
          Edit Global Rules for <strong>{roleKey}</strong>
        </h3>
        <p className={styles.modalSubtitle}>Configure the rules that affect access for this key.</p>
        {isThreshold && (
          <div className={styles.inputGroup}>
            <label className={styles.label}>Required User Approvals</label>
            <input
              type="number"
              value={localRuleSet.outputs?.threshold || ""}
              onChange={(e) => setLocalRuleSet({ ...localRuleSet, outputs: { threshold: Number(e.target.value) } })}
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
                <select value={rule.field} onChange={(e) => updateRuleField(index, e.target.value)} className={styles.inputField}>
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
                    <select value={condition.method} onChange={(e) => updateConditionField(index, condIndex, "method", e.target.value)} className={styles.inputField}>
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
                          onChange={(e) => updateConditionField(index, condIndex, "values", [e.target.value, condition.values[1]])}
                          placeholder="Min"
                        />
                        <input
                          className={styles.inputField}
                          value={condition.values[1]}
                          onChange={(e) => updateConditionField(index, condIndex, "values", [condition.values[0], e.target.value])}
                          placeholder="Max"
                        />
                      </div>
                    ) : (
                      <input
                        className={styles.inputField}
                        value={condition.values[0]}
                        onChange={(e) => updateConditionField(index, condIndex, "values", [e.target.value])}
                        placeholder="Value"
                      />
                    )}
                  </div>
                  <button onClick={() => removeConditionFromRule(index, condIndex)} className={styles.secondaryButton}>
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
            Close Editor
          </button>
        </div>
      </div>
    </div>
  );
};
