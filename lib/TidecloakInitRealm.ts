// tideSetup.ts
import fs from "fs";
import path from "path";

const TIDECLOAK_LOCAL_URL = "https://staging.dauth.me";

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
    console.log("Realm JSON:", realmJson);

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

    await fetch(`${TIDECLOAK_LOCAL_URL}/admin/realms/${realm}/tideAdminResources/toggle-iga`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: new URLSearchParams({ isIGAEnabled: "true" }),
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

export async function createTestUser(token: string, realm: string) {
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
        }),
    });

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
    console.log(clients)
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
