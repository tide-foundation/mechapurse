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
import { User, Role, RuleDefinition } from "@/interfaces/interface";

// --- Constants for rule creation (global rules) ---
const methods = ["LESS_THAN", "GREATER_THAN", "BETWEEN", "EQUAL_TO"];
const fields = ["TxHash", "TxIndex", "Amount", "Fee", "TTL"];

// Define RulesContainer interface in your codebase as:
// export interface RulesContainer {
//   settings: { [roleName: string]: RuleDefinition[] };
// }

// GlobalSettings is now represented as a RulesContainer.
type RulesContainer = { settings: { [roleName: string]: RuleDefinition[] } };

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
    const [globalSettings, setGlobalSettings] = useState<RulesContainer>({ settings: {} });
    const [globalModalOpen, setGlobalModalOpen] = useState(false);
    // Local state to track which role's rules are being edited
    const [currentRoleKey, setCurrentRoleKey] = useState<string | null>(null);

    const router = useRouter();

    // Fetch data when view changes
    useEffect(() => {
        if (view === "users") fetchUsers();
        if (view === "roles") fetchRoles();
        if (view === "settings") {
            fetchRoles(); // we need roles to display key sections.
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
                // API should return an object matching RulesContainer: { settings: { [roleName]: RuleDefinition[] } }
                setGlobalSettings(data || { settings: {} });
            } else {
                setGlobalSettings({ settings: {} });
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
            setCurrentRoleKey(null);
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

    // Open global rules modal for a given role key
    const openGlobalRulesForRole = (roleKey: string) => {
        setCurrentRoleKey(roleKey);
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
                            Configure the global rule definitions for each role.
                        </p>
                        {roles.length > 0 ? (
                            <div className="mb-4">
                                {roles.map((role) => {
                                    const rules = globalSettings.settings[role.name] || [];
                                    return (
                                        <CollapsibleSection key={role.id} title={role.name} defaultExpanded={false}>
                                            {rules.length > 0 ? (
                                                rules.map((rule, idx) => (
                                                    <div key={idx} className="ml-4 mt-1 text-sm text-gray-600">
                                                        <div>
                                                            <span className="font-semibold">Field:</span> {rule.field}
                                                        </div>
                                                        <div>
                                                            <span className="font-semibold">Method:</span> {rule.method}
                                                        </div>
                                                        <div>
                                                            <span className="font-semibold">Values:</span> {rule.values.join(", ")}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="ml-4 text-sm text-gray-500">No rules set for this role.</p>
                                            )}
                                            <button
                                                onClick={() => openGlobalRulesForRole(role.name)}
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
                                No roles available to configure global settings.
                            </p>
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
                                    View, create and manage system roles and their settings.
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

            {/* Global Settings Modal for Role */}
            {globalModalOpen && currentRoleKey && (
                <GlobalSettingsModalForRole
                    roleKey={currentRoleKey}
                    settings={globalSettings.settings[currentRoleKey] || []}
                    onClose={() => {
                        setGlobalModalOpen(false);
                        setCurrentRoleKey(null);
                    }}
                    onSave={(updatedRules) =>
                        saveGlobalSettings({
                            settings: { ...globalSettings.settings, [currentRoleKey]: updatedRules },
                        })
                    }
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
        className={`flex items-center space-x-3 p-3 rounded-lg w-full transition-all duration-200 ${active ? "bg-blue-700" : "hover:bg-blue-800"
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
    // Optional Role-specific Authorization Info
    const [authAdded, setAuthAdded] = useState(
        !!(role?.signModels || role?.threshold || role?.authorizerType)
    );
    const [signModels, setSignModels] = useState(role?.signModels ? role.signModels.join(", ") : "");
    const [threshold, setThreshold] = useState(role?.threshold || "");
    const [authorizerType, setAuthorizerType] = useState(role?.authorizerType || "");

    // When adding auth info, prefill defaults if fields are empty.
    const handleAddAuth = () => {
        if (!signModels && !threshold && !authorizerType) {
            setThreshold("1");
            setSignModels("CardanoTx:1");
            setAuthorizerType("cardanoTransactions");
        }
        setAuthAdded(true);
    };

    // When removing, clear the fields.
    const handleRemoveAuth = () => {
        setAuthAdded(false);
        setSignModels("");
        setThreshold("");
        setAuthorizerType("");
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            name,
            description,
            signModels: authAdded ? signModels.split(",").map((s) => s.trim()).filter(Boolean) : [],
            threshold: authAdded ? threshold : "",
            authorizerType: authAdded ? authorizerType : "",
        });
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
                    {/* Optional: Role-specific Authorization Info as an action */}
                    {!authAdded && (
                        <button
                            type="button"
                            onClick={handleAddAuth}
                            className="text-sm text-blue-600 mb-4"
                        >
                            Add Authorization Info
                        </button>
                    )}
                    {authAdded && (
                        <div className="mb-5">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-semibold text-gray-700">
                                    Authorization Info
                                </span>
                                <button
                                    type="button"
                                    onClick={handleRemoveAuth}
                                    className="text-xs text-red-600"
                                >
                                    Remove Authorization Info
                                </button>
                            </div>
                            <div className="mb-3">
                                <label className="block text-sm font-medium mb-1">
                                    Sign Models (comma separated)
                                </label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={signModels}
                                    onChange={(e) => setSignModels(e.target.value)}
                                />
                            </div>
                            <div className="mb-3">
                                <label className="block text-sm font-medium mb-1">
                                    Threshold
                                </label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={threshold}
                                    onChange={(e) => setThreshold(e.target.value)}
                                />
                            </div>
                            <div className="mb-3">
                                <label className="block text-sm font-medium mb-1">
                                    Authorizer Type
                                </label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={authorizerType}
                                    onChange={(e) => setAuthorizerType(e.target.value)}
                                />
                            </div>
                        </div>
                    )}
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
const GlobalSettingsModalForRole = ({
    roleKey,
    settings,
    onClose,
    onSave,
}: {
    roleKey: string;
    settings: RuleDefinition[];
    onClose: () => void;
    onSave: (rules: RuleDefinition[]) => void;
}) => {
    const [localRules, setLocalRules] = useState<RuleDefinition[]>(settings);

    const updateRuleField = (index: number, fieldValue: string) => {
        const newRules = [...localRules];
        newRules[index] = { ...newRules[index], field: fieldValue };
        setLocalRules(newRules);
    };

    const updateRuleMethod = (index: number, methodValue: string) => {
        const newRules = [...localRules];
        const currentRule = newRules[index];
        if (methodValue === "BETWEEN") {
            currentRule.values = currentRule.values.length === 2 ? currentRule.values : ["", ""];
        } else {
            currentRule.values = currentRule.values.length === 1 ? currentRule.values : [""];
        }
        newRules[index] = { ...currentRule, method: methodValue };
        setLocalRules(newRules);
    };

    const updateRuleValue = (index: number, valueIndex: number, newValue: string) => {
        const newRules = [...localRules];
        const rule = newRules[index];
        const values = [...rule.values];
        values[valueIndex] = newValue;
        newRules[index] = { ...rule, values };
        setLocalRules(newRules);
    };

    const removeRule = (index: number) => {
        const newRules = localRules.filter((_, i) => i !== index);
        setLocalRules(newRules);
    };

    const addRule = () => {
        setLocalRules([...localRules, { field: fields[0], method: methods[0], values: [""] }]);
    };

    const handleSave = () => {
        onSave(localRules);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-4xl mx-4">
                <h3 className="text-2xl font-semibold mb-6 text-gray-800">
                    Edit Global Rules for <span className="font-bold">{roleKey}</span>
                </h3>
                <div className="mb-6">
                    {localRules.map((rule, index) => (
                        <div key={index} className="mb-4 p-4 border rounded bg-gray-50">
                            <div className="flex flex-col md:flex-row gap-4 mb-3">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium mb-1">Field</label>
                                    <select
                                        value={rule.field}
                                        onChange={(e) => updateRuleField(index, e.target.value)}
                                        className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {fields.map((f) => (
                                            <option key={f} value={f}>
                                                {f}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium mb-1">Method</label>
                                    <select
                                        value={rule.method}
                                        onChange={(e) => updateRuleMethod(index, e.target.value)}
                                        className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {methods.map((m) => (
                                            <option key={m} value={m}>
                                                {m}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="mb-3">
                                {rule.method === "BETWEEN" ? (
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium mb-1">Value 1</label>
                                            <input
                                                type="text"
                                                value={rule.values[0] || ""}
                                                onChange={(e) => updateRuleValue(index, 0, e.target.value)}
                                                className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium mb-1">Value 2</label>
                                            <input
                                                type="text"
                                                value={rule.values[1] || ""}
                                                onChange={(e) => updateRuleValue(index, 1, e.target.value)}
                                                className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Value</label>
                                        <input
                                            type="text"
                                            value={rule.values[0] || ""}
                                            onChange={(e) => updateRuleValue(index, 0, e.target.value)}
                                            className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end">
                                <button
                                    onClick={() => removeRule(index)}
                                    className="text-red-500 hover:text-red-600 transition text-sm"
                                >
                                    Delete Rule
                                </button>
                            </div>
                        </div>
                    ))}
                    <button
                        onClick={addRule}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded transition"
                    >
                        <FaPlus className="inline mr-1" />
                        Add Rule
                    </button>
                </div>
                <div className="flex justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border rounded hover:bg-gray-100 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition"
                    >
                        Save Global Rules
                    </button>
                </div>
            </div>
        </div>
    );
};
