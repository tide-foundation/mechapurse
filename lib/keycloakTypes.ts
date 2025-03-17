export interface ClientRepresentation {
    id?: string;
    clientId?: string;
    name?: string;
    description?: string;
    type?: string;
    rootUrl?: string;
    adminUrl?: string;
    baseUrl?: string;
    surrogateAuthRequired?: boolean;
    enabled?: boolean;
    alwaysDisplayInConsole?: boolean;
    clientAuthenticatorType?: string;
    secret?: string;
    registrationAccessToken?: string;
    defaultRoles?: string[];
    redirectUris?: string[];
    webOrigins?: string[];
    notBefore?: number;
    bearerOnly?: boolean;
    consentRequired?: boolean;
    standardFlowEnabled?: boolean;
    implicitFlowEnabled?: boolean;
    directAccessGrantsEnabled?: boolean;
    serviceAccountsEnabled?: boolean;
    authorizationServicesEnabled?: boolean;
    directGrantsOnly?: boolean;
    publicClient?: boolean;
    frontchannelLogout?: boolean;
    protocol?: string;
    attributes?: Record<string, string>;
    authenticationFlowBindingOverrides?: Record<string, string>;
    fullScopeAllowed?: boolean;
    nodeReRegistrationTimeout?: number;
    registeredNodes?: Record<string, number>;
    protocolMappers?: any[];  // Can be refined to `ProtocolMapperRepresentation[]`
    clientTemplate?: string;
    useTemplateConfig?: boolean;
    useTemplateScope?: boolean;
    useTemplateMappers?: boolean;
    defaultClientScopes?: string[];
    optionalClientScopes?: string[];
    authorizationSettings?: any; // Can be refined to `ResourceServerRepresentation`
    access?: Record<string, boolean>;
    origin?: string;
}

export interface RoleRepresentation {
    id?: string;
    name?: string;
    description?: string;
    scopeParamRequired?: boolean;
    composite?: boolean;
    composites?: Composites;
    clientRole?: boolean;
    containerId?: string;
    attributes?: Record<string, string[]>;
}

// Define the Composites interface based on expected Keycloak API structure
export interface Composites {
    realm?: RoleRepresentation[];
    client?: Record<string, RoleRepresentation[]>;
    application?: Record<string, RoleRepresentation[]>;
}

export interface ComponentRepresentation {
    id?: string;
    name?: string;
    providerId?: string;
    providerType?: string;
    parentId?: string;
    subType?: string;
    config?: Record<string, any[]>; // A map where each key has an array as its value
}

