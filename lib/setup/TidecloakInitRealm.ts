// tideSetup.ts
import fs from "fs";
import path from "path";
import { Roles } from "@/app/constants/roles";
import { TX_MANAGEMENT_CLIENT } from "@/app/constants/client";
import { ClientRepresentation, RoleRepresentation } from "../keycloakTypes";

const TIDECLOAK_LOCAL_URL = process.env.TIDECLOAK_LOCAL_URL ?? "http://localhost:8080"
const REALM_MGMT = "realm-management";

export async function getAdminToken() {
    const response = await fetch(`${TIDECLOAK_LOCAL_URL}/realms/master/protocol/openid-connect/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            username: "admin",
            password: "password",
            grant_type: "password",
            client_id: "admin-cli",
        }),
    });

    const data = await response.json();
    return data.access_token;
}

export async function createRealm(token: string, realmJsonPath: string) {
    const realmJson = fs.readFileSync(realmJsonPath, "utf-8");

    const response = await fetch(`${TIDECLOAK_LOCAL_URL}/admin/realms`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: realmJson,
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create realm: ${errorText}`);
    }

    return;
}

export async function setUpTideRealm(token: string, realm: string, email = "email@tide.org") {
    await fetch(`${TIDECLOAK_LOCAL_URL}/admin/realms/${realm}/vendorResources/setUpTideRealm`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: new URLSearchParams({ email }),
    });

    await fetch(`${TIDECLOAK_LOCAL_URL}/admin/realms/${realm}/tide-admin/toggle-iga`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: new URLSearchParams({ isIGAEnabled: "true" }),
    });
}

export async function signIdpSettings(token: string, realm: string) {
    await fetch(`${TIDECLOAK_LOCAL_URL}/admin/realms/${realm}/vendorResources/sign-idp-settings`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
    });

}



export async function updateCustomAdminUIDomain(token: string, realm: string, domain: string) {
    const instanceRes = await fetch(`${TIDECLOAK_LOCAL_URL}/admin/realms/${realm}/identity-provider/instances/tide`, {
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
    });

    const instance = await instanceRes.json();
    instance.config["CustomAdminUIDomain"] = domain;

    await fetch(`${TIDECLOAK_LOCAL_URL}/admin/realms/${realm}/identity-provider/instances/tide`, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(instance),
    });

    await signIdpSettings(token, realm)
}

export async function approveAndCommitClients(token: string, realm: string) {
    const response = await fetch(`${TIDECLOAK_LOCAL_URL}/admin/realms/${realm}/tide-admin/change-set/clients/requests`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    const clientRequests = await response.json();

    for (const request of clientRequests) {
        const payload = {
            changeSetId: request.draftRecordId,
            changeSetType: request.changeSetType,
            actionType: request.actionType,
        };

        await fetch(`${TIDECLOAK_LOCAL_URL}/admin/realms/${realm}/tide-admin/change-set/sign`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        await fetch(`${TIDECLOAK_LOCAL_URL}/admin/realms/${realm}/tide-admin/change-set/commit`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });
    }
}

export async function approveAndCommitUsers(token: string, realm: string) {
    const response = await fetch(`${TIDECLOAK_LOCAL_URL}/admin/realms/${realm}/tide-admin/change-set/users/requests`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    const userRequests = await response.json();

    for (const request of userRequests) {
        const payload = {
            changeSetId: request.draftRecordId,
            changeSetType: request.changeSetType,
            actionType: request.actionType,
        };

        await fetch(`${TIDECLOAK_LOCAL_URL}/admin/realms/${realm}/tide-admin/change-set/sign`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        await fetch(`${TIDECLOAK_LOCAL_URL}/admin/realms/${realm}/tide-admin/change-set/commit`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });
    }
}

export async function createAdminUser(token: string, realm: string) {
    await fetch(`${TIDECLOAK_LOCAL_URL}/admin/realms/${realm}/users`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            username: "admin",
            email: "admin@tidecloak.com",
            firstName: "admin",
            lastName: "user",
            enabled: true,
            emailVerified: false,
            requiredActions: [],
            attributes: { locale: "" },
            groups: [],
        })
    });

    const userRes = await fetch(`${TIDECLOAK_LOCAL_URL}/admin/realms/${realm}/users?username=admin`, {
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
    });

    const users = await userRes.json();
    const userId = users[0].id;

    await GrantUserRole(userId, realm, Roles.Admin, token)
}

export async function getAdminUserInviteLink(token: string, realm: string) {
    const userRes = await fetch(`${TIDECLOAK_LOCAL_URL}/admin/realms/${realm}/users?username=admin`, {
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
    });

    const users = await userRes.json();
    const userId = users[0].id;

    const inviteRes = await fetch(`${TIDECLOAK_LOCAL_URL}/admin/realms/${realm}/tideAdminResources/get-required-action-link?userId=${userId}&lifespan=43200`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(["link-tide-account-action"]),
    });

    return inviteRes.text();
}


export async function fetchAdapterConfig(token: string, realm: string, clientId: string, outputPath: string) {
    const clientRes = await fetch(`${TIDECLOAK_LOCAL_URL}/admin/realms/${realm}/clients?clientId=${clientId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    const clients = await clientRes.json();
    const uid = clients[0].id;

    const adapterRes = await fetch(`${TIDECLOAK_LOCAL_URL}/admin/realms/${realm}/vendorResources/get-installations-provider?clientId=${uid}&providerId=keycloak-oidc-keycloak-json`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    const adapterConfig = await adapterRes.text();
    fs.writeFileSync(outputPath, adapterConfig);
}

export async function validateUser(token: string, realm: string) {
    const userRes = await fetch(`${TIDECLOAK_LOCAL_URL}/admin/realms/${realm}/users?username=admin`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    const users = await userRes.json();
    const user = users[0];
    const attrs = user.attributes || {};


    if (!user) {
        throw new Error("User not found");
    }

    const hasUserKey = !!(attrs["tideUserKey"] && attrs["tideUserKey"][0]);
    const hasVuid = !!(attrs["vuid"] && attrs["vuid"][0]);
    const success = hasUserKey && hasVuid;

    return success;
}


const GrantUserRole = async (userId: string, realm: string, roleName: string, token: string): Promise<void> => {
    const client = roleName === Roles.Admin ? await getClientByClientId(REALM_MGMT, realm, token) : await getClientByClientId(TX_MANAGEMENT_CLIENT, realm, token);
    console.log(client)

    if (client === null || client?.id === undefined) {
        throw new Error(`Could not grant user role, client ${TX_MANAGEMENT_CLIENT} does not exist`);
    }

    const role = roleName === Roles.Admin ? await getTideRealmAdminRole(realm, token) : await getClientRoleByName(realm, roleName, client.id, token);
    const response = await fetch(`${TIDECLOAK_LOCAL_URL}/admin/realms/${realm}/users/${userId}/role-mappings/clients/${client.id}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify([role])
    });
    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Error granting user role: ${response.statusText}`);
        throw new Error(`Error  granting user role: ${errorBody}`);
    }
    return;
}

const getClientByClientId = async (
    clientId: string,
    realm: string,
    token: string
): Promise<ClientRepresentation | null> => {
    try {
        const response = await fetch(`${TIDECLOAK_LOCAL_URL}/admin/realms/${realm}/clients?clientId=${clientId}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (!response.ok) {
            console.error(`Error fetching client by clientId: ${response.statusText}`);
            return null;
        }
        const clients: ClientRepresentation[] = await response.json();
        return clients.length > 0 ? clients[0] : null; // should only be one client in the realm with this clientID
    } catch (error) {
        console.error("Error fetching client by clientId:", error);
        return null;
    }
};

const getTideRealmAdminRole = async (realm: string, token: string): Promise<RoleRepresentation> => {
    const client: ClientRepresentation | null = await getClientByClientId(REALM_MGMT, realm, token); // TODO: add to constants 
    if (client === null) throw new Error("No client found with clientId: " + REALM_MGMT);

    const response = await fetch(`${TIDECLOAK_LOCAL_URL}/admin/realms/${realm}/clients/${client.id}/roles?search=${Roles.Admin}`, {
        method: 'GET',
        headers: {
            accept: 'application/json',
            Authorization: `Bearer ${token}`,
        },
    });
    if (!response.ok) {
        console.error(`Error fetching tide realm admin role: ${response.statusText}`);
        throw new Error("Error fetching tide realm admin role")
    }

    const roles = await response.json()
    return roles[0];
};
const getClientRoleByName = async (realm: string, roleName: string, clientuuid: string, token: string): Promise<RoleRepresentation> => {
    const response = await fetch(`${TIDECLOAK_LOCAL_URL}/admin/realms/${realm}/clients/${clientuuid}/roles/${roleName}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Error fetching client role by name: ${response.statusText}`);
        throw new Error(`Error fetching client role by name: ${errorBody}`);
    }
    return response.json();
};
