import { DraftSignRequest, AdminAuthorizationPack } from "@/interfaces/interface";

export const createAuthorization = async (authorizerApproval: string, authorizerAuthentication: string) => {
    const response = await fetch("/api/transaction/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorizerApproval, authorizerAuthentication }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to create authorization");
    return { authorization: data.authorization, ruleSettings: data.ruleSettings };
};

export const addDraftRequest = async (vuid: string, data: string, dataJson: string): Promise<DraftSignRequest> => {
    const response = await fetch("/api/transaction/db/AddDraftRequest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vuid, data, dataJson }),
    });
    const resp = await response.json();
    if (!response.ok) throw new Error(resp.error || "Unable to add draft");
    return resp.draftReq;
};

export const addAdminAuth = async (id: string, vuid: string, authorization: string) => {
    const res = await fetch("/api/transaction/db/AddAdminAuth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, vuid, authorization }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
};

export const deleteDraftRequest = async (id: string) => {
    const res = await fetch("/api/transaction/db/DeleteDraftRequest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
};

export const getTxAuthorization = async (id: string): Promise<AdminAuthorizationPack[]> => {
    const res = await fetch("/api/transaction/db/GetTransactionAuths", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.authPacks;
};