import { DraftSignRequest } from "@/interfaces/interface";

export const createAuthorization = async (
    authorizerApproval: string,
    authorizerAuthentication: string,
    type: string
  ) => {
    const response = await fetch(`/api/utils?type=${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorizerApproval, authorizerAuthentication }),
    });

    const data = await response.json();
    if (!response.ok)
        throw new Error(data.error || "Unable to create authorization");
    
    return data;
  };

  export const addRuleSettingDraftRequest = async (
    vuid: string,
    draft: string,
    draftJson: string
  ): Promise<{ id: string; ruleReqDraft: any; expiry: string }> => {
    const response = await fetch("/api/admin/db/rules/AddRuleSettingDraftReq", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vuid, draft, draftJson }),
    });

    const resp = await response.json();
    if (!response.ok) throw new Error(resp.error || "Unable to create draft");
    return resp.draftReq;
  };