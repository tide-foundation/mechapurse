// Tidecloak
export interface ChangeSetRequest {
  changeSetId: string,
  changeSetType: string,
  actionType: string,
}

// Keycloak
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

export interface UserRepresentation {
    id?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    emailVerified?: boolean;
    attributes?: { [key: string]: string[] };
    userProfileMetadata?: UserProfileMetadata;
    self?: string;
    origin?: string;
    createdTimestamp?: number; // int64
    enabled?: boolean;
    totp?: boolean;
    federationLink?: string;
    serviceAccountClientId?: string;
    credentials?: CredentialRepresentation[];
    disableableCredentialTypes?: string[]; // using an array for set of strings
    requiredActions?: string[];
    federatedIdentities?: FederatedIdentityRepresentation[];
    realmRoles?: string[];
    clientRoles?: { [key: string]: string[] };
    clientConsents?: UserConsentRepresentation[];
    notBefore?: number; // int32
    applicationRoles?: { [key: string]: string[] };
    socialLinks?: SocialLinkRepresentation[];
    groups?: string[];
    access?: { [key: string]: boolean };
  }
  
  export interface UserProfileMetadata {
    attributes?: UserProfileAttributeMetadata[];
    groups?: UserProfileAttributeGroupMetadata[];
  }

  export interface UserProfileAttributeGroupMetadata {
    name?: string;
    displayHeader?: string;
    displayDescription?: string;
    annotations?: { [key: string]: any };
  }
  

  export interface UserProfileAttributeMetadata {
    name?: string;
    displayName?: string;
    required?: boolean;
    readOnly?: boolean;
    annotations?: { [key: string]: any };
    validators?: { [key: string]: any };
    group?: string;
    multivalued?: boolean;
  }

  
  export interface UserProfileAttributeMetadata {
    name?: string;
    displayName?: string;
    required?: boolean;
    readOnly?: boolean;
    annotations?: { [key: string]: any };
    validators?: { [key: string]: any };
    group?: string;
    multivalued?: boolean;
  }

  
  export interface CredentialRepresentation {
    id?: string;
    type?: string;
    userLabel?: string;
    createdDate?: number; // int64
    secretData?: string;
    credentialData?: string;
    priority?: number; // int32
    value?: string;
    temporary?: boolean;
    device?: string;
    hashedSaltedValue?: string;
    salt?: string;
    hashIterations?: number; // int32
    counter?: number; // int32
    algorithm?: string;
    digits?: number; // int32
    period?: number; // int32
    config?: { [key: string]: any };
  }
  
  export interface FederatedIdentityRepresentation {
    identityProvider?: string;
    userId?: string;
    userName?: string;
  }
  
  
  export interface SocialLinkRepresentation {
    socialProvider?: string;
    socialUserId?: string;
    socialUsername?: string;
  }
  
  export interface UserConsentRepresentation {
    clientId?: string;
    grantedClientScopes?: string[];
    createdDate?: number; // int64
    lastUpdatedDate?: number; // int64
    grantedRealmRoles?: string[];
  }
  
  export interface MappingsRepresentation {
    realmMappings?: RoleRepresentation[];
    clientMappings?: { [key: string]: ClientMappingsRepresentation };
  }
  
  export interface ClientMappingsRepresentation {
    id?: string;
    client?: string;
    mappings?: RoleRepresentation[];
  }
    