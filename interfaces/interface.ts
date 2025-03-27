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
    clientRole?: boolean;
    clientId?: string;
    isAuthorizer: boolean;
}

// For role authorization info (used when editing a role)
export interface AuthorizerInfoRequest {
    signModels: string[];
    threshold: string;
    authorizerType: string;
}

export interface RulesContainer {
    authorizationSettings: { [id: string]: RuleSet };
    validationSettings: { [id: string]: RuleSet };
}

export interface RuleSet {
    ruleSetId?: string;
    rules: RuleDefinition[];
    outputs?: { [key: string]: number };
}

export interface RuleDefinition {
    ruleId?: string;
    field: string;
    conditions: RuleCondition[];
    aud: string;
    output?: { [key: string]: number };
}

export interface RuleCondition {
    method: string | number;
    values: string[];
}

export interface RealmKeyRules {
    rules: RulesContainer;
    rulesCert: string;
}



