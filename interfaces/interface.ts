// --- Interfaces ---
export interface ChangeRequest {
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
    details?: string;
    [key: string]: any;
}

export interface UserChangeRecord {
    username: string;
    clientId: string;
    proofDetailId: string;
    accessDraft: string;
}


export interface DraftSignRequest {
    id: string,
    userId: string,
    txBody: string,
    draft: string,
    draftJson: string,
    expiry: string,
}

export interface RuleSettingDraft {
    id: string,
    userId: string,
    ruleReqDraft: string,
    ruleReqDraftJson: string,
    expiry: string,
    status: string
}
export interface RuleSettingAuthorization {
    id: string,
    userId: string,
    ruleSettingsDraftId: string,
    authorization: string,
    rejected: boolean
}


export interface AdminAuthorizationPack {
    id: string,
    userId: string,
    cardanoTxRequestId: string,
    authorization: string,
    rejected: boolean

}

export interface User {
    id: string;
    name: string;
    email: string;
    role: string[];
}

export interface UserUpdate extends User {
    rolesToAdd?: string[];
    rolesToRemove?: string[];
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

export interface RuleSettings {
    id: string,
    validationSettings: { [id: string]: RuleSet[] };
    previousVersion?: string,
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
    aud?: string;
    output?: { [key: string]: number };
}

export interface RuleCondition {
    method: string | number;
    values: string[];
}

export interface RuleConfiguration {
    id: string,
    ruleConfig: RealmKeyRules,
}

export interface RealmKeyRules {
    rules: RuleSettings;
    rulesCert: string;
}


export interface CardanoTxBody {
    Inputs: CardanoTxBodyInputs[],
    Outputs: CardanoTxBodyOutputs[],
    Fee: string,
    TTL: string,

}

export interface CardanoTxBodyInputs {
    TxHash: string,
    TxIndex: string,
}

export interface CardanoTxBodyOutputs {
    Address: string,
    Amount: string
}


