// --- Interfaces ---
export interface User {
    id: string;
    name: string;
    email: string;
    role: string;
}

export interface Role {
    id: string;
    name: string;
    description?: string;
    // Role-specific auth info fields (optional)
    signModels?: string[];
    threshold?: string;
    authorizerType?: string;
}

// For global rules, we work with rule definitions.
export interface RuleDefinition {
    field: string;
    method: string;
    values: string[];
}

// For role authorization info (used when editing a role)
export interface AuthorizerInfoRequest {
    signModels: string[];
    threshold: string;
    authorizerType: string;
}
export interface RulesContainer {
    settings: { [roleName: string]: RuleDefinition[] };
}

