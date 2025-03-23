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
    isAuthorizer: boolean
}

// For role authorization info (used when editing a role)
export interface AuthorizerInfoRequest {
    signModels: string[];
    threshold: string;
    authorizerType: string;
}

export interface RulesContainer {
    authorizationSettings: { [id: string]: RuleDefinition[] };
    validationSettings: { [id: string]: RuleDefinition[] };
}

export interface RuleDefinition {
    id?: string;
    field: string;
    conditions: RuleCondition[];
    output?: { [key: string]: number };
}

export interface RuleCondition {
    method: string;
    values: string[];
}

export interface RealmKeyRules {
    rules: RulesContainer;
    rulesCert: string;
}



