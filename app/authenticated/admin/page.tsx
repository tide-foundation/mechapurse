"use client";

import { JSX, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  FaCogs,
  FaTrash,
  FaPlus,
  FaEdit,
  FaSave,
  FaUndo,
  FaListAlt,
} from "react-icons/fa";
import { useRouter } from "next/navigation";
import {
  User,
  Role,
  RuleSettings,
  RuleSet,
  RuleDefinition,
  RuleCondition,
  UserUpdate,
} from "@/interfaces/interface";
import styles from "@/styles/AdminDashboard.module.css";
import { Heimdall } from "@/tide-modules/modules/heimdall";
import { useAuth } from "@/components/AuthContext";
import { addRuleSettingDraftRequest, createAuthorization } from "@/app/utils/helperMethods";
import { RuleSetCard } from "@/components/admin/RuleSetCard";
import UserUpdateModal from "@/components/admin/UserUpdateModal";
import { ChangeSetRequest } from "@/lib/keycloakTypes";
import { SignChangeSetRequest } from "@/lib/tidecloakApi";

// External Components
import CollapsibleSection from "@/components/admin/CollapsibileSection";
import UserChangeRequestCard from "@/components/admin/UserChangeRequestCard";
import RulesChangeRequestCard from "@/components/admin/RulesChangeRequestCard";
import SimpleGlobalSettingsModal from "@/components/admin/SimpleGlobalSettingsModal";

// --- Constants for Rule Creation ---
const methods = [
  "LESS_THAN",
  "GREATER_THAN",
  "BETWEEN",
  "EQUAL_TO",
  "TOTAL_LESS_THAN",
  "TOTAL_MORE_THAN",
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

// Reserved key for the global threshold rules (advanced mode only)
const DEFAULT_THRESHOLD_KEY = "CardanoTx:1.BlindSig:1";
// Display name for threshold rules
const THRESHOLD_DISPLAY_KEY = "Threshold Rules (CardanoTx1.BlindSig:1)";

// --- Modal Wrapper ---
const ModalWrapper = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
};

// --- New Action Bar for Change Requests ---
const ChangeRequestActionBar = ({
  selectedCR,
  onReview,
  onCommit,
  onCancel,
}: {
  selectedCR: ChangeRequest | null;
  onReview: () => void;
  onCommit: () => void;
  onCancel: () => void;
}) => {
  const status = selectedCR?.status || "";
  const canReview = status === "DRAFT" || status === "PENDING";
  const canCommit = status === "APPROVED";
  return (
    <div
      className={styles.actionBar}
      style={{ marginBottom: "1rem", display: "flex", gap: "1rem" }}
    >
      <button onClick={onReview} disabled={!selectedCR || !canReview} className={styles.reviewButton}>
        Review
      </button>
      <button onClick={onCommit} disabled={!selectedCR || !canCommit} className={styles.commitButton}>
        Commit
      </button>
      <button onClick={onCancel} disabled={!selectedCR} className={styles.cancelButton}>
        Cancel
      </button>
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
  userRecord?: UserChangeRecord[];
  status?: string;
  role?: string;
  details?: string;
  [key: string]: any;
}

interface UserChangeRecord {
  username: string;
  clientId: string;
  proofDetailId: string;
  accessDraft: string;
}

// --- Main AdminDashboard Component ---
export default function AdminDashboard() {
  const { vuid, createRuleSettingsDraft, signRuleSettingsDraft } = useAuth();
  const router = useRouter();
  const [view, setView] = useState("settings");
  const [activeTab, setActiveTab] = useState("user"); // "user" or "rules"
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState<Role | null>(null);
  const [userUpdateModalOpen, setUserUpdateModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [userCreateModalOpen, setUserCreateModalOpen] = useState(false);
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
  const [selectedChangeRequest, setSelectedChangeRequest] = useState<ChangeRequest | null>(null);
  const totalChangeRequests = useMemo(
    () => userChangeRequests.length + rulesChangeRequests.length,
    [userChangeRequests.length, rulesChangeRequests.length]
  );

  // Toggle between Simple and Advanced modes.
  const [useSimpleMode, setUseSimpleMode] = useState(true);

  useEffect(() => {
    fetchUserChangeRequests();
    fetchRulesChangeRequests();
  }, []);

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
    setSelectedChangeRequest(null);
  }, [view]);

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
            [DEFAULT_THRESHOLD_KEY]: [],

          };
        }
        setGlobalSettings(data || { id: "", validationSettings: { [DEFAULT_THRESHOLD_KEY]: [] } });
        const newExpanded: { [key: string]: boolean } = {};
        Object.keys(data.validationSettings || {}).forEach((key) => {
          newExpanded[key] = true;
        });
        setExpandedKeys(newExpanded);
      } else {
        setGlobalSettings({ id: "", validationSettings: { [DEFAULT_THRESHOLD_KEY]: [] } });
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
      setUserChangeRequests([...data.settings]);
    } catch (error) {
      console.error("Error fetching user change requests:", error);
    }
  };

  const fetchRulesChangeRequests = async () => {
    try {
      const res = await fetch("/api/admin/change-requests/rules");
      if (!res.ok) throw new Error("Failed to fetch rules change requests");
      const data = await res.json();
      const rulesArray = Array.isArray(data) ? data : Object.values(data ?? {});
      setRulesChangeRequests(rulesArray);
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
      const draftReq = await addRuleSettingDraftRequest(vuid, draft, reqDraft.settings);
      if (draftReq === null) {
        throw new Error("No rule sign draft req");
      }
      await heimdall.openEnclave();

      const authApproval = await heimdall.getAuthorizerApproval(draft, "Rules:1", draftReq.expiry, "base64");

      if (authApproval.accepted) {
        const authzAuthn = await heimdall.getAuthorizerAuthentication();
        heimdall.closeEnclave();
        const data = await createAuthorization(authApproval.data, authzAuthn, "rules");
        const threshold = Number(reqDraft.threshold);

        if (!isNaN(threshold) && threshold === 1) {
          const endpoint = "/api/admin/global-rules/saveAndSign";
          const payload = {
            ruleDraft: draftReq.ruleReqDraft,
            authorizations: [data.authorization],
            expiry: draftReq.expiry,
            newSetting: reqDraft.settings,
          };

          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (!res.ok) {
            throw new Error("Failed to save global settings");
          }

          // remove 
          await fetch("/api/admin/change-requests/rules/cancel", {
            method: "POST",
            body: JSON.stringify({ id: draftReq.id }),
          });
        } else {
          const endpoint = "/api/admin/change-requests/rules/authorization";
          const payload = {
            ruleReqDraftId: draftReq.id,
            vuid: vuid,
            authorizations: data.authorization,
            rejected: false,
          };
          await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        }
      } else {
        const endpoint = "/api/admin/change-requests/rules/authorization";
        const payload = {
          ruleReqDraftId: draftReq.id,
          vuid: vuid,
          authorizations: null,
          rejected: true,
        };

        await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      setUnsavedChanges(false);
      fetchGlobalSettings();
      await fetchRulesChangeRequests();
    } catch (error) {
      console.error("Error saving global settings:", error);
    }
  };

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

  const openEditUserUpdateModal = (user: User) => {
    setUserToEdit(user);
    setUserUpdateModalOpen(true);
  };

  const updateUser = async (user: User, updatedUser: Partial<UserUpdate>) => {
    try {
      if (user.firstName !== updatedUser.firstName || user.email !== updatedUser.email || user.lastName !== updatedUser.lastName) {
        const res = await fetch(`/api/admin/users`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedUser),
        });
        if (!res.ok) throw new Error("Failed to update user");
      }
      if (user.role.length !== updatedUser.role?.length) {
        const res = await fetch(`/api/admin/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedUser),
        });
        if (!res.ok) throw new Error("Failed to update user");
        await fetchUserChangeRequests();
      }
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };

  const createUser = async (newUser: { username: string; firstName: string; lastName: string; email: string }) => {
    try {
      const res = await fetch("/api/admin/users/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newUser }),
      });
      const message = await res.json();
      if (!res.ok) throw new Error("Failed to create user. Error " + message.error);
      fetchUsers();
    } catch (error) {
      console.error("Error creating user:", error);
    }
  };

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

      // Duplicate or update the corresponding threshold rule.
      if (updatedRuleSet.outputs && updatedRuleSet.outputs.threshold) {
        const thresholdRuleId = `threshold_rule_${currentKey}`;

        // Remove any existing ruleSetId property and place our thresholdRuleId first.
        const { ruleSetId, ...rest } = updatedRuleSet;
        const newThresholdRule = { ruleSetId: thresholdRuleId, ...rest };

        let thresholdObj: RuleSet[] = globalSettings.validationSettings[DEFAULT_THRESHOLD_KEY];
        const existingIndex = thresholdObj.findIndex(r => r.ruleSetId === thresholdRuleId);
        if (existingIndex !== -1) {
          thresholdObj[existingIndex] = newThresholdRule;
        } else {
          thresholdObj.push(newThresholdRule);
        }
        updatedValidationSettings[DEFAULT_THRESHOLD_KEY] = thresholdObj;
        setGlobalSettings({ ...globalSettings, validationSettings: updatedValidationSettings });
      }
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

  // UPDATED: Review change request method differentiates based on type.
  const reviewChangeRequest = async (cr: ChangeRequest) => {
    const changeRequest: ChangeSetRequest = {
      changeSetId: cr.draftRecordId,
      changeSetType: cr.changeSetType,
      actionType: cr.actionType,
    };
    if (cr.type === "user") {
      const response = await fetch("/api/admin/change-requests/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changeRequest),
      });
      const res = (await response.json()).response;
      const heimdall = new Heimdall(res.customDomainUri, [vuid]);
      await heimdall.openEnclave();
      const authorizerApproval = await heimdall.getAuthorizerApproval(
        res.changeSetRequests,
        "UserContext:1",
        res.expiry,
        "base64url"
      );
      if (authorizerApproval.draft === res.changeSetRequests) {
        if (authorizerApproval.accepted === false) {
          await fetch("/api/admin/change-requests/addRejection", {
            method: "POST",
            body: JSON.stringify({ changeRequest: changeRequest }),
          });
        } else if (authorizerApproval.accepted === true) {
          const authorizerAuthentication = await heimdall.getAuthorizerAuthentication();
          await fetch("/api/admin/change-requests/addAuthorization", {
            method: "POST",
            body: JSON.stringify({
              changeRequest: changeRequest,
              authorizerApproval: authorizerApproval.data,
              authorizerAuthentication: authorizerAuthentication,
            }),
          });
        }
      }
      heimdall.closeEnclave();
    } else if (cr.type === "rules") {
      const response = await fetch(`/api/admin/change-requests/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cr),
      });
      const res = (await response.json());
      const heimdall = new Heimdall(res.customDomainUri, [vuid]);
      await heimdall.openEnclave();
      const authorizerApproval = await heimdall.getAuthorizerApproval(
        res.draft,
        "Rules:1",
        res.expiry,
        "base64url"
      );
      if (authorizerApproval.draft === res.draft) {
        if (authorizerApproval.accepted === false) {
          await fetch("/api/admin/change-requests/rules/authorization", {
            method: "POST",
            body: JSON.stringify({ ruleReqDraftId: cr.id, vuid: vuid, authorization: null, rejected: true }),
          });
        } else if (authorizerApproval.accepted === true) {
          const authorizerAuthentication = await heimdall.getAuthorizerAuthentication();
          const data = await createAuthorization(authorizerApproval.data, authorizerAuthentication, "rules");

          await fetch("/api/admin/change-requests/rules/authorization", {
            method: "POST",
            body: JSON.stringify({ ruleReqDraftId: cr.id, vuid: vuid, authorizations: data.authorization, rejected: false }),
          });
        }
      }
      heimdall.closeEnclave();
    }
    await fetchUserChangeRequests();
    await fetchRulesChangeRequests();
    setSelectedChangeRequest(null);
  };

  // UPDATED: Commit change request method differentiates based on type.
  const commitChangeRequest = async (cr: ChangeRequest) => {
    const changeRequest: ChangeSetRequest = {
      actionType: cr.actionType,
      changeSetId: cr.draftRecordId,
      changeSetType: cr.changeSetType,
    };
    if (cr.type === "user") {
      await fetch("/api/admin/change-requests/commit", {
        method: "POST",
        body: JSON.stringify({ changeRequest: changeRequest }),
      });
    } else if (cr.type === "rules") {
      const endpoint = "/api/admin/change-requests/rules/commit";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cr),
      });

      if (!res.ok) {
        throw new Error("Failed to save global settings");
      }
      // remove 
      await fetch("/api/admin/change-requests/rules/cancel", {
        method: "POST",
        body: JSON.stringify({ id: cr.id }),
      });
    }
    await fetchUserChangeRequests();
    await fetchRulesChangeRequests();
    setSelectedChangeRequest(null);
  };

  // UPDATED: Cancel change request method differentiates based on type.
  const cancelChangeRequest = async (cr: ChangeRequest) => {
    const changeRequest: ChangeSetRequest = {
      actionType: cr.actionType,
      changeSetId: cr.draftRecordId,
      changeSetType: cr.changeSetType,
    };
    if (cr.type === "user") {
      await fetch("/api/admin/change-requests/cancel", {
        method: "POST",
        body: JSON.stringify({ changeRequest: changeRequest }),
      });
    } else if (cr.type === "rules") {
      await fetch("/api/admin/change-requests/rules/cancel", {
        method: "POST",
        body: JSON.stringify({ id: cr.id }),
      });
    }
    await fetchUserChangeRequests();
    await fetchRulesChangeRequests();
    setSelectedChangeRequest(null);
  };

  return (
    <div className={styles.adminLayout}>
      {/* Sidebar */}
      <aside className={styles.adminSidebar}>
        <h1 className={styles.sidebarTitle}>Admin Panel</h1>
        <SidebarButton active={view === "settings"} onClick={() => navigateTo("settings")} icon={<FaCogs />} text="Global Settings" />
        <SidebarButton active={view === "users"} onClick={() => navigateTo("users")} icon={<FaCogs />} text="Manage Users" />
        <SidebarButton active={view === "roles"} onClick={() => navigateTo("roles")} icon={<FaCogs />} text="Manage Roles" />
        <SidebarButton active={view === "changeRequests"} onClick={() => navigateTo("changeRequests")} icon={<FaListAlt />} text="Change Requests" badge={totalChangeRequests > 0 ? totalChangeRequests : undefined} />
      </aside>

      {/* Main Content */}
      <main className={styles.adminContent}>
        {view === "settings" && (
          <div className={styles.adminCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className={styles.cardTitle}>Global Settings</h2>
              <button onClick={() => setUseSimpleMode((prev) => !prev)} className={styles.secondaryButton}>
                {useSimpleMode ? "Switch to Advanced Settings" : "Switch to Simple Settings"}
              </button>
            </div>
            <p className={styles.cardSubtitle}>
              Configure system-wide threshold and role-based validation rules.
            </p>
            {/* In simple mode, hide the global threshold rules section */}
            {!useSimpleMode && (
              <CollapsibleSection
                title={THRESHOLD_DISPLAY_KEY}
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
                <p style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: "0.95rem", marginTop: "1rem" }}>
                  Note: Global threshold rules are not editable in simple mode.
                  To enforce threshold approvals, please switch to advanced mode.
                </p>
              </CollapsibleSection>
            )}
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
                        ruleSets.length === 0 && (
                          <button onClick={() => openGlobalRulesForModal(roleKey, null)} className={styles.primaryButton}>
                            <FaPlus /> Add Rule Set
                          </button>
                        )
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
            <div className={styles.sectionHeader}>
              <h2 className={styles.cardTitle}>Manage Users</h2>
              <button onClick={() => setUserCreateModalOpen(true)} className={styles.primaryButton}>
                <FaPlus /> Add User
              </button>
            </div>
            <p className={styles.cardSubtitle}>Review and manage user accounts.</p>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Firstname</th>
                  <th>Lastname</th>
                  <th>Email</th>
                  <th>Roles</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} onClick={() => openEditUserUpdateModal(user)} style={{ cursor: "pointer" }}>
                    <td>{user.firstName}</td>
                    <td>{user.lastName}</td>
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
              <div className={styles.pfTabs} style={{ display: "flex", borderBottom: "2px solid #e0e0e0" }}>
                <button
                  onClick={() => setActiveTab("user")}
                  className={activeTab === "user" ? styles.activeTab : styles.tab}
                  style={{
                    flex: 1,
                    padding: "1rem",
                    fontSize: "1.1rem",
                    border: "none",
                    borderBottom: activeTab === "user" ? "3px solid #007bba" : "3px solid transparent",
                    backgroundColor: activeTab === "user" ? "#e0f7ff" : "transparent",
                    cursor: "pointer",
                  }}
                >
                  Users {userChangeRequests.length > 0 && <span className={styles.counter}>{userChangeRequests.length}</span>}
                </button>
                <button
                  onClick={() => setActiveTab("rules")}
                  className={activeTab === "rules" ? styles.activeTab : styles.tab}
                  style={{
                    flex: 1,
                    padding: "1rem",
                    fontSize: "1.1rem",
                    border: "none",
                    borderBottom: activeTab === "rules" ? "3px solid #007bba" : "3px solid transparent",
                    backgroundColor: activeTab === "rules" ? "#e0f7ff" : "transparent",
                    cursor: "pointer",
                  }}
                >
                  Rules {rulesChangeRequests.length > 0 && <span className={styles.counter}>{rulesChangeRequests.length}</span>}
                </button>
              </div>
            </div>
            <ChangeRequestActionBar
              selectedCR={selectedChangeRequest}
              onReview={async () => selectedChangeRequest && await reviewChangeRequest(selectedChangeRequest)}
              onCommit={async () => selectedChangeRequest && await commitChangeRequest(selectedChangeRequest)}
              onCancel={async () => selectedChangeRequest && await cancelChangeRequest(selectedChangeRequest)}
            />
            <div className={styles.tabContent}>
              {activeTab === "user" ? (
                userChangeRequests.length > 0 ? (
                  userChangeRequests.map((cr) => (
                    <UserChangeRequestCard
                      key={cr.draftRecordId}
                      changeRequest={cr}
                      onSelect={() => setSelectedChangeRequest({ ...cr, type: "user" })}
                      selected={selectedChangeRequest?.draftRecordId === cr.draftRecordId}
                    />
                  ))
                ) : (
                  <p className={styles.emptyState}>No user change requests pending.</p>
                )
              ) : rulesChangeRequests.length > 0 ? (
                rulesChangeRequests.map((cr) => (
                  <RulesChangeRequestCard
                    key={cr.id}
                    changeRequest={cr}
                    onSelect={() => setSelectedChangeRequest({ ...cr, type: "rules" })}
                    selected={selectedChangeRequest?.id === cr.id}
                  />
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
      {userUpdateModalOpen && userToEdit && (
        <ModalWrapper>
          <UserUpdateModal
            user={userToEdit}
            roles={allRoles}
            onClose={() => setUserUpdateModalOpen(false)}
            onUpdate={async (updatedUser: Partial<UserUpdate>) => {
              await updateUser(userToEdit, updatedUser);
              setUserUpdateModalOpen(false);
              fetchUsers();
            }}
          />
        </ModalWrapper>
      )}
      {userCreateModalOpen && (
        <ModalWrapper>
          <UserCreateModal
            onClose={() => setUserCreateModalOpen(false)}
            onCreate={async (newUser) => {
              await createUser(newUser);
              setUserCreateModalOpen(false);
            }}
          />
        </ModalWrapper>
      )}
      {globalModalOpen && currentKey && (
        <ModalWrapper>
          {useSimpleMode && currentKey !== DEFAULT_THRESHOLD_KEY ? (
            <SimpleGlobalSettingsModal
              roleKey={currentKey}
              settings={
                globalSettingsType === "threshold"
                  ? (globalSettings.validationSettings[DEFAULT_THRESHOLD_KEY] &&
                    (currentRuleSetIndex !== null
                      ? globalSettings.validationSettings[DEFAULT_THRESHOLD_KEY][currentRuleSetIndex]
                      : { rules: [] })) ||
                  { rules: [] }
                  : (globalSettings.validationSettings[currentKey] &&
                    (currentRuleSetIndex !== null
                      ? globalSettings.validationSettings[currentKey][currentRuleSetIndex]
                      : { rules: [] })) ||
                  { rules: [] }
              }
              onClose={() => {
                setGlobalModalOpen(false);
                setCurrentKey(null);
                setCurrentRuleSetIndex(null);
              }}
              onSave={handleModalSave}
              isThreshold={globalSettingsType === "threshold"}
            />
          ) : (
            <GlobalSettingsModalForRole
              roleKey={currentKey}
              settings={
                globalSettingsType === "threshold"
                  ? (globalSettings.validationSettings[DEFAULT_THRESHOLD_KEY] &&
                    (currentRuleSetIndex !== null
                      ? globalSettings.validationSettings[DEFAULT_THRESHOLD_KEY][currentRuleSetIndex]
                      : { rules: [] })) ||
                  { rules: [] }
                  : (globalSettings.validationSettings[currentKey] &&
                    (currentRuleSetIndex !== null
                      ? globalSettings.validationSettings[currentKey][currentRuleSetIndex]
                      : { rules: [] })) ||
                  { rules: [] }
              }
              onClose={() => {
                setGlobalModalOpen(false);
                setCurrentKey(null);
                setCurrentRuleSetIndex(null);
              }}
              onSave={handleModalSave}
              isThreshold={globalSettingsType === "threshold"}
            />
          )}
        </ModalWrapper>
      )}
    </div>
  );
}

// --- Sidebar Button Component ---
interface SidebarButtonProps {
  onClick: () => void;
  icon: JSX.Element;
  text: string;
  badge?: number;
  active?: boolean;
}
const SidebarButton = ({ onClick, icon, text, badge, active }: SidebarButtonProps) => {
  return (
    <button onClick={onClick} className={`${styles.sidebarButton} ${active ? styles.active : ""}`}>
      <div className={styles.sidebarButtonContent}>
        <div className={styles.iconContainer}>{icon}</div>
        <div className={styles.sidebarText}>{text}</div>
        {badge !== undefined && badge > 0 && <div className={styles.counter}>{badge}</div>}
      </div>
    </button>
  );
};

// --- Role Modal Component ---
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
        <h3 id="roleModalTitle" className={styles.modalTitle} style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "1rem" }}>
          {role ? "Edit Role" : "Add New Role"}
        </h3>
        <p className={styles.modalSubtitle} style={{ fontSize: "1.1rem", marginBottom: "1.5rem" }}>
          Provide clear details so users know what permissions this role grants.
        </p>
        <form onSubmit={handleSubmit}>
          <div className={styles.inputGroup} style={{ marginBottom: "1.5rem" }}>
            <label className={styles.label} style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "0.5rem" }}>
              Role Name
            </label>
            <input
              type="text"
              className={styles.inputField}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Administrator"
              required
              style={{ fontSize: "1.1rem", padding: "0.75rem" }}
            />
          </div>
          <div className={styles.inputGroup} style={{ marginBottom: "1.5rem" }}>
            <label className={styles.label} style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "0.5rem" }}>
              Description
            </label>
            <textarea
              className={styles.inputField}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the role's responsibilities"
              rows={3}
              style={{ fontSize: "1.1rem", padding: "0.75rem" }}
            />
          </div>
          <div className={styles.inputGroup} style={{ marginBottom: "1.5rem" }}>
            <label className={styles.label} style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "0.5rem" }}>
              <input type="checkbox" checked={isAuthorizer} onChange={(e) => setIsAuthorizer(e.target.checked)} />{" "}
              Is Authorizer Role?
            </label>
          </div>
          <div className={styles.modalActions} style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", borderTop: "1px solid #ddd", paddingTop: "1rem" }}>
            <button type="button" onClick={onClose} className={styles.secondaryButton} style={{ fontSize: "1rem", padding: "0.6rem 1.2rem", borderRadius: "6px" }}>
              Cancel
            </button>
            <button type="submit" className={styles.primaryButton} style={{ fontSize: "1rem", padding: "0.6rem 1.2rem", borderRadius: "6px" }}>
              Save Role
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Global Settings Modal for Role Component ---
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
    const { ruleSetId, ...rest } = localRuleSet;
    onSave({ ...rest, ruleSetId });
  };

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="globalRulesModalTitle">
      <div className={styles.appCardLarge}>
        <h3 id="globalRulesModalTitle" className={styles.modalTitle} style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "1rem" }}>
          Edit Global Rules for <strong>{roleKey}</strong>
        </h3>
        <p className={styles.modalSubtitle} style={{ fontSize: "1.25rem", marginBottom: "1.5rem" }}>
          Configure the rules that affect access for this key.
        </p>
        {isThreshold && (
          <div className={styles.inputGroup} style={{ marginBottom: "1.5rem" }}>
            <label className={styles.label} style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "0.5rem" }}>
              Required User Approvals
            </label>
            <input
              type="number"
              value={localRuleSet.outputs?.threshold || ""}
              onChange={(e) =>
                setLocalRuleSet({ ruleSetId: "threshold_rule", ...localRuleSet, outputs: { threshold: Number(e.target.value) } })
              }
              className={styles.inputField}
              placeholder="e.g., 3"
              style={{ fontSize: "1.1rem", padding: "0.75rem" }}
            />
          </div>
        )}
        <div className={styles.rulesEditor}>
          {localRuleSet.rules.map((rule, index) => (
            <div key={index} className={styles.ruleEditor} style={{ marginBottom: "1.5rem", padding: "1rem", border: "1px solid #e0e0e0", borderRadius: "6px", background: "#fafafa" }}>
              <div className={styles.inputGroup} style={{ marginBottom: "1rem" }}>
                <label className={styles.label} style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                  Field
                </label>
                <select value={rule.field} onChange={(e) => updateRuleField(index, e.target.value)} className={styles.inputField} style={{ fontSize: "1.1rem", padding: "0.75rem" }}>
                  {fields.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              {rule.conditions.map((condition, condIndex) => (
                <div key={condIndex} className={styles.conditionEditor} style={{ marginBottom: "1rem" }}>
                  <div className={styles.inputGroup} style={{ marginBottom: "0.75rem" }}>
                    <label className={styles.label} style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                      Method
                    </label>
                    <select
                      value={condition.method}
                      onChange={(e) => updateConditionField(index, condIndex, "method", e.target.value)}
                      className={styles.inputField}
                      style={{ fontSize: "1.1rem", padding: "0.75rem" }}
                    >
                      {methods.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.inputGroup} style={{ marginBottom: "0.75rem" }}>
                    {condition.method === "BETWEEN" ? (
                      <div className={styles.betweenInputs} style={{ display: "flex", gap: "0.5rem" }}>
                        <input
                          className={styles.inputField}
                          value={condition.values[0]}
                          onChange={(e) => updateConditionField(index, condIndex, "values", [e.target.value, condition.values[1]])}
                          placeholder="Min"
                          style={{ fontSize: "1.1rem", padding: "0.75rem", flex: "1" }}
                        />
                        <input
                          className={styles.inputField}
                          value={condition.values[1]}
                          onChange={(e) => updateConditionField(index, condIndex, "values", [condition.values[0], e.target.value])}
                          placeholder="Max"
                          style={{ fontSize: "1.1rem", padding: "0.75rem", flex: "1" }}
                        />
                      </div>
                    ) : (
                      <input
                        className={styles.inputField}
                        value={condition.values[0]}
                        onChange={(e) => updateConditionField(index, condIndex, "values", [e.target.value])}
                        placeholder="Value"
                        style={{ fontSize: "1.1rem", padding: "0.75rem", width: "100%" }}
                      />
                    )}
                  </div>
                  <button
                    onClick={() => removeConditionFromRule(index, condIndex)}
                    className={styles.secondaryButton}
                    style={{ fontSize: "1rem", padding: "0.6rem 1.2rem", borderRadius: "6px", marginTop: "0.5rem" }}
                  >
                    Remove Condition
                  </button>
                </div>
              ))}
              <button onClick={() => addConditionToRule(index)} className={styles.primaryButton} style={{ fontSize: "1rem", padding: "0.6rem 1.2rem", borderRadius: "6px", marginRight: "0.5rem" }}>
                + Add Condition
              </button>
              <button onClick={() => removeRule(index)} className={styles.secondaryButton} style={{ fontSize: "1rem", padding: "0.6rem 1.2rem", borderRadius: "6px" }}>
                Delete Rule
              </button>
            </div>
          ))}
          <button onClick={addRule} className={styles.primaryButton} style={{ fontSize: "1rem", padding: "0.6rem 1.2rem", borderRadius: "6px" }}>
            <FaPlus /> Add Rule
          </button>
        </div>
        <div className={styles.modalActions} style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", borderTop: "1px solid #ddd", paddingTop: "1rem", marginTop: "2rem" }}>
          <button onClick={onClose} className={styles.secondaryButton} style={{ fontSize: "1rem", padding: "0.6rem 1.2rem", borderRadius: "6px" }}>
            Cancel
          </button>
          <button onClick={handleSave} className={styles.primaryButton} style={{ fontSize: "1rem", padding: "0.6rem 1.2rem", borderRadius: "6px" }}>
            Close Editor
          </button>
        </div>
      </div>
    </div>
  );
};

// --- UserCreateModal Component ---
interface UserCreateModalProps {
  onClose: () => void;
  onCreate: (newUser: { username: string; firstName: string; lastName: string; email: string }) => void | Promise<void>;
}
const UserCreateModal = ({ onClose, onCreate }: UserCreateModalProps) => {
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({ username, firstName, lastName, email });
  };

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="userCreateModalTitle">
      <div className={`${styles.appCard} ${styles.userModalCard}`}>
        <h3 id="userCreateModalTitle" className={styles.modalTitle} style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "1rem" }}>
          Add New User
        </h3>
        <p className={styles.modalSubtitle} style={{ fontSize: "1.25rem", marginBottom: "1.5rem" }}>
          Please fill in the details for the new user.
        </p>
        <form onSubmit={handleSubmit}>
          <div className={styles.inputGroup} style={{ marginBottom: "1.5rem" }}>
            <label className={styles.label} style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "0.5rem" }}>
              Username
            </label>
            <input type="text" className={styles.inputField} value={username} onChange={(e) => setUsername(e.target.value)} required style={{ fontSize: "1.1rem", padding: "0.75rem" }} />
          </div>
          <div className={styles.inputGroup} style={{ marginBottom: "1.5rem" }}>
            <label className={styles.label} style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "0.5rem" }}>
              First Name
            </label>
            <input type="text" className={styles.inputField} value={firstName} onChange={(e) => setFirstName(e.target.value)} required style={{ fontSize: "1.1rem", padding: "0.75rem" }} />
          </div>
          <div className={styles.inputGroup} style={{ marginBottom: "1.5rem" }}>
            <label className={styles.label} style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "0.5rem" }}>
              Last Name
            </label>
            <input type="text" className={styles.inputField} value={lastName} onChange={(e) => setLastName(e.target.value)} required style={{ fontSize: "1.1rem", padding: "0.75rem" }} />
          </div>
          <div className={styles.inputGroup} style={{ marginBottom: "1.5rem" }}>
            <label className={styles.label} style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "0.5rem" }}>
              Email
            </label>
            <input type="email" className={styles.inputField} value={email} onChange={(e) => setEmail(e.target.value)} required style={{ fontSize: "1.1rem", padding: "0.75rem" }} />
          </div>
          <div className={styles.modalActions} style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", borderTop: "1px solid #ddd", paddingTop: "1rem" }}>
            <button type="button" onClick={onClose} className={styles.secondaryButton} style={{ fontSize: "1rem", padding: "0.6rem 1.2rem", borderRadius: "6px" }}>
              Cancel
            </button>
            <button type="submit" className={styles.primaryButton} style={{ fontSize: "1rem", padding: "0.6rem 1.2rem", borderRadius: "6px" }}>
              Add User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
