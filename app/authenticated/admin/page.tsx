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

// --- Constants for rule creation (global rules) ---
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

// Use the same BLIND_SIG_KEY for authorization settings
const BLIND_SIG_KEY = "BlindSig:1";

export default function AdminDashboard() {
  // Three views: "settings", "users", "roles"
  const [view, setView] = useState("settings");

  // Users and Roles
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  // Modal state for Role CRUD
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState<Role | null>(null);

  // Global Settings state (RulesContainer)
  const [globalSettings, setGlobalSettings] = useState<RulesContainer>({
    authorizationSettings: { [BLIND_SIG_KEY]: { rules: [] } },
    validationSettings: {},
  });
  const [globalModalOpen, setGlobalModalOpen] = useState(false);
  // For validation, currentKey is now a structured key (either realm or client)
  const [currentKey, setCurrentKey] = useState<string | null>(null);
  // Toggle between editing authorization or validation settings
  const [globalSettingsType, setGlobalSettingsType] = useState<"authorization" | "validation">("authorization");

  const router = useRouter();

  // Fetch data when view changes
  useEffect(() => {
    if (view === "users") fetchUsers();
    if (view === "roles") fetchRoles();
    if (view === "settings") {
      fetchRoles(); // roles needed for validation settings
      fetchGlobalSettings();
    }
  }, [view]);

  // --- Fetch Users ---
  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  // --- Fetch Roles ---
  const fetchRoles = async () => {
    try {
      const response = await fetch("/api/admin/roles");
      if (!response.ok) throw new Error("Failed to fetch roles");
      const data = await response.json();
      setRoles(data.roles);
    } catch (error) {
      console.error("Error fetching roles:", error);
    }
  };

  // --- Fetch Global Settings ---
  const fetchGlobalSettings = async () => {
    try {
      const response = await fetch("/api/admin/global-rules");
      if (response.ok) {
        const data = await response.json();
        // data is expected to be a RulesContainer
        setGlobalSettings(
          data || {
            authorizationSettings: { [BLIND_SIG_KEY]: { rules: [] } },
            validationSettings: {},
          }
        );
      } else {
        setGlobalSettings({ authorizationSettings: { [BLIND_SIG_KEY]: { rules: [] } }, validationSettings: {} });
      }
    } catch (error) {
      console.error("Error fetching global settings:", error);
    }
  };

  // --- Save Global Settings ---
  const saveGlobalSettings = async (updatedSettings: RulesContainer) => {
    try {
      const response = await fetch("/api/admin/global-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSettings),
      });
      if (!response.ok) throw new Error("Failed to save global settings");
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
      let response;
      if (roleToEdit) {
        response = await fetch(`/api/admin/roles/${roleToEdit.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(role),
        });
      } else {
        response = await fetch("/api/admin/roles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(role),
        });
      }
      if (!response.ok) throw new Error("Failed to save role");
      setRoleModalOpen(false);
      fetchRoles();
    } catch (error) {
      console.error("Error saving role:", error);
    }
  };

  const deleteRole = async (roleId: string) => {
    try {
      const response = await fetch(`/api/admin/roles/${roleId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete role");
      fetchRoles();
    } catch (error) {
      console.error("Error deleting role:", error);
    }
  };

  // Open Global Rules Modal for Authorization
  const openGlobalRulesForAuthorization = () => {
    // Since authorizationSettings is fixed to key BLIND_SIG_KEY
    setCurrentKey(BLIND_SIG_KEY);
    setGlobalModalOpen(true);
  };

  // Open Global Rules Modal for Validation using structured role key
  const openGlobalRulesForValidation = (roleKey: string) => {
    setCurrentKey(roleKey);
    setGlobalModalOpen(true);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar */}
      <aside className="bg-blue-900 text-white w-64 h-[calc(100vh-4rem)] fixed top-16 left-0 p-6 space-y-6">
        <h1 className="text-xl font-bold">Admin Panel</h1>
        <nav className="mt-6 space-y-4">
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
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 ml-64 p-6 bg-gray-100 h-[calc(100vh-4rem)] overflow-y-auto">
        {view === "settings" && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-2xl font-semibold mb-4">Global Settings</h3>
            <p className="text-gray-600 mb-4">
              Configure the global rule definitions.
            </p>
            {/* Toggle buttons for Authorization vs Validation */}
            <div className="flex mb-4">
              <button
                onClick={() => setGlobalSettingsType("authorization")}
                className={`px-4 py-2 mr-2 rounded ${
                  globalSettingsType === "authorization"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-800"
                }`}
              >
                Authorization Settings
              </button>
              <button
                onClick={() => setGlobalSettingsType("validation")}
                className={`px-4 py-2 rounded ${
                  globalSettingsType === "validation"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-800"
                }`}
              >
                Validation Settings
              </button>
            </div>
            {globalSettingsType === "authorization" ? (
              <CollapsibleSection title={BLIND_SIG_KEY} defaultExpanded={true}>
                {globalSettings.authorizationSettings[BLIND_SIG_KEY] &&
                globalSettings.authorizationSettings[BLIND_SIG_KEY].rules.length > 0 ? (
                  globalSettings.authorizationSettings[BLIND_SIG_KEY].rules.map((rule, idx) => (
                    <div key={idx} className="ml-4 mt-1 text-sm text-gray-600">
                      <div>
                        <span className="font-semibold">Field:</span> {rule.field}
                      </div>
                      <div>
                        <span className="font-semibold">Method:</span>{" "}
                        {rule.conditions[0]?.method}
                      </div>
                      <div>
                        <span className="font-semibold">Values:</span>{" "}
                        {(rule.conditions[0]?.values || []).join(", ")}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="ml-4 text-sm text-gray-500">
                    No rules set for authorization.
                  </p>
                )}
                <button
                  onClick={openGlobalRulesForAuthorization}
                  className="mt-2 px-4 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded transition text-sm"
                >
                  Edit Rules
                </button>
              </CollapsibleSection>
            ) : (
              // Validation settings: iterate over roles using structured keys
              <>
                {roles.length > 0 ? (
                  <div className="mb-4">
                    {roles.map((role) => {
                      // Generate a structured key based on role type:
                      // For client roles, use: resource_access.{clientId}.roles.{role.name}
                      // For realm roles, use: realm_access.roles.{role.name}
                      const roleKey =
                        role.clientRole && role.clientId
                          ? `resource_access.${role.clientId}.roles.${role.name}`
                          : `realm_access.roles.${role.name}`;
                      const ruleSet: RuleSet =
                        globalSettings.validationSettings[roleKey] || { rules: [] };
                      return (
                        <CollapsibleSection
                          key={role.id}
                          title={roleKey}
                          defaultExpanded={false}
                        >
                          {ruleSet.rules.length > 0 ? (
                            ruleSet.rules.map((rule, idx) => (
                              <div key={idx} className="ml-4 mt-1 text-sm text-gray-600">
                                <div>
                                  <span className="font-semibold">Field:</span> {rule.field}
                                </div>
                                <div>
                                  <span className="font-semibold">Method:</span>{" "}
                                  {rule.conditions[0]?.method}
                                </div>
                                <div>
                                  <span className="font-semibold">Values:</span>{" "}
                                  {(rule.conditions[0]?.values || []).join(", ")}
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="ml-4 text-sm text-gray-500">
                              No rules set for this role.
                            </p>
                          )}
                          <button
                            onClick={() => openGlobalRulesForValidation(roleKey)}
                            className="mt-2 px-4 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded transition text-sm"
                          >
                            Edit Rules
                          </button>
                        </CollapsibleSection>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mb-4 text-gray-500">
                    No roles available to configure validation settings.
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {view === "users" && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-2xl font-semibold mb-4">Manage Users</h3>
            <button className="mb-4 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg">
              <FaPlus className="inline mr-2" /> Add User
            </button>
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr className="bg-blue-700 text-white">
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Email</th>
                  <th className="p-3 text-left">Role</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b">
                    <td className="p-3">{user.name}</td>
                    <td className="p-3">{user.email}</td>
                    <td className="p-3">{user.role}</td>
                    <td className="p-3 flex gap-3 justify-center">
                      <button className="text-yellow-500">
                        <FaEdit />
                      </button>
                      <button className="text-red-500">
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {view === "roles" && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-2xl font-semibold">Manage Roles</h3>
                <p className="text-gray-600">
                  View, create and manage system roles.
                </p>
              </div>
              <button
                onClick={openAddRoleModal}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
              >
                <FaPlus className="inline mr-2" /> Add Role
              </button>
            </div>

            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr className="bg-blue-700 text-white">
                  <th className="p-3 text-left">Role Name</th>
                  <th className="p-3 text-left">Description</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {roles.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-gray-500">
                      No roles available.
                    </td>
                  </tr>
                ) : (
                  roles.map((role) => (
                    <tr key={role.id} className="border-b">
                      <td className="p-3">{role.name}</td>
                      <td className="p-3 text-gray-600">
                        {role.description || "No description"}
                      </td>
                      <td className="p-3 text-center flex justify-center gap-3">
                        <button
                          onClick={() => openEditRoleModal(role)}
                          className="text-yellow-500 hover:text-yellow-700"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => deleteRole(role.id)}
                          className="text-red-500 hover:text-red-700"
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
      </div>

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
          // Pass a RuleSet – defaulting to an empty RuleSet if none exists
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

// --- Collapsible Section Component ---
const CollapsibleSection = ({
  title,
  children,
  defaultExpanded = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <div className="border border-gray-200 rounded mb-4">
      <div
        className="flex justify-between items-center bg-gray-100 p-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-gray-700 font-semibold">{title}</span>
        <span>{expanded ? "-" : "+"}</span>
      </div>
      {expanded && <div className="p-3">{children}</div>}
    </div>
  );
};

// --- Sidebar Button Component ---
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
}) => (
  <button
    onClick={onClick}
    className={`flex items-center space-x-3 p-3 rounded-lg w-full transition-all duration-200 ${
      active ? "bg-blue-700" : "hover:bg-blue-800"
    }`}
  >
    {icon} <span>{text}</span>
  </button>
);

// --- Role Editor Modal ---
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md mx-4">
        <h3 className="text-2xl font-semibold mb-6 text-gray-800">
          {role ? "Edit Role" : "Add Role"}
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label className="block text-sm font-medium mb-1">Role Name</label>
            <input
              type="text"
              className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="mb-5">
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            ></textarea>
          </div>
          <div className="mb-5">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={isAuthorizer}
                onChange={(e) => setIsAuthorizer(e.target.checked)}
                className="form-checkbox"
              />
              <span className="ml-2">Is Authorizer Role?</span>
            </label>
          </div>
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Global Settings Modal for Role ---
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
  // Use a RuleSet as local state (holds both rules and optional output)
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
      aud: isAuthorization ? "model" : "user",
    };
    setLocalRuleSet({ ...localRuleSet, rules: [...localRuleSet.rules, newRule] });
  };

  const removeRule = (index: number) => {
    const newRules = localRuleSet.rules.filter((_, i) => i !== index);
    setLocalRuleSet({ ...localRuleSet, rules: newRules });
  };

  const handleSave = () => {
    // For authorization settings, ensure ruleSetId is set to "threshold_rule"
    const updatedRuleSet = isAuthorization
      ? { ...localRuleSet, ruleSetId: "threshold_rule" }
      : localRuleSet;

      const { ruleSetId, ...rest } = updatedRuleSet;
    onSave({ ruleSetId, ...rest});
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-4xl mx-4">
        <h3 className="text-2xl font-semibold mb-6 text-gray-800">
          Edit Global Rules for <span className="font-bold">{roleKey}</span>
        </h3>
        {/* For authorization settings, display a global threshold input */}
        {isAuthorization && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Output Threshold
            </label>
            <input
              type="number"
              value={localRuleSet.outputs?.threshold || ""}
              onChange={(e) =>
                setLocalRuleSet({
                  ...localRuleSet,
                  outputs: { threshold: Number(e.target.value) },
                })
              }
              className="w-full border border-gray-300 p-2 rounded"
            />
          </div>
        )}
        <div className="mb-6">
          {localRuleSet.rules.map((rule, index) => (
            <div key={index} className="mb-4 p-4 border rounded bg-gray-50">
              <div className="flex flex-col md:flex-row gap-4 mb-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Field</label>
                  <select
                    value={rule.field}
                    onChange={(e) => updateRuleField(index, e.target.value)}
                    className="w-full border border-gray-300 p-2 rounded"
                  >
                    {fields.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {rule.conditions.map((condition, condIndex) => (
                <div key={condIndex} className="border p-2 mb-2 rounded">
                  <div className="flex gap-2">
                    <select
                      value={condition.method}
                      onChange={(e) =>
                        updateConditionField(index, condIndex, "method", e.target.value)
                      }
                      className="border p-2 rounded w-1/3"
                    >
                      {methods.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    {condition.method === "BETWEEN" ? (
                      <>
                        <input
                          className="border p-2 rounded w-1/4"
                          value={condition.values[0]}
                          onChange={(e) =>
                            updateConditionField(index, condIndex, "values", [
                              e.target.value,
                              condition.values[1],
                            ])
                          }
                        />
                        <input
                          className="border p-2 rounded w-1/4"
                          value={condition.values[1]}
                          onChange={(e) =>
                            updateConditionField(index, condIndex, "values", [
                              condition.values[0],
                              e.target.value,
                            ])
                          }
                        />
                      </>
                    ) : (
                      <input
                        className="border p-2 rounded w-1/2"
                        value={condition.values[0]}
                        onChange={(e) =>
                          updateConditionField(index, condIndex, "values", [e.target.value])
                        }
                      />
                    )}
                    <button
                      onClick={() => removeConditionFromRule(index, condIndex)}
                      className="text-red-500 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={() => addConditionToRule(index)}
                className="text-sm px-2 py-1 bg-green-600 text-white rounded"
              >
                Add Condition
              </button>
              <div className="flex justify-end mt-2">
                <button
                  onClick={() => removeRule(index)}
                  className="text-red-500 hover:text-red-600"
                >
                  Delete Rule
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={addRule}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded"
          >
            Add Rule
          </button>
        </div>
        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            Save Global Rules
          </button>
        </div>
      </div>
    </div>
  );
};
