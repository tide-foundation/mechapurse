import { DraftSignRequest } from "@/interfaces/interface";
import { GetUsernameForUserId } from "@/lib/db";

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


/**
* Recursively transforms all object keys so that each key starts with a capital letter.
* If the input is an array, it transforms each element.
*
* @param obj - The object or array to transform.
* @returns A new object or array with all keys starting with a capital letter.
*/
function capitalizeKeys(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(item => capitalizeKeys(item));
  } else if (obj !== null && typeof obj === "object") {
    return Object.keys(obj).reduce((acc, key) => {
      // Capitalize the first letter of the key and leave the rest of the key as is.
      const capitalKey = key.charAt(0).toUpperCase() + key.slice(1);
      acc[capitalKey] = capitalizeKeys(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
}
/**
 * Transforms the Cardano transaction body JSON string:
 * 1. Parses the JSON.
 * 2. Processes the Outputs array, replacing Amount objects (with a coin property) with that coin value.
 * 3. Ensures all keys in the object start with a capital letter.
 * 4. Returns the updated object as a JSON string.
 *
 * @param json - The JSON string representing the transaction body.
 * @returns The transformed JSON string with capitalized keys.
 */
export function transformCardanoTxBody(walletAddress: string, walletAddressHex: string, json: string): string {
  // Parse the JSON string into an object.
  const txBody = JSON.parse(json);

  // Process each output:
  // If "Amount" is an object with a "coin" property, replace it with the coin value.
  if (Array.isArray(txBody.outputs)) {
    txBody.Outputs = txBody.outputs.map((output: any) => {
      if (output.amount && typeof output.amount === "object" && "coin" in output.amount) {
        output.amount = output.amount.coin;
      }
      if (output.address === walletAddress) {
        output.address = walletAddressHex
      }
      return output;
    });
  }

  // Now, recursively ensure every key in the object starts with a capital letter.
  const transformed = capitalizeKeys(txBody);

  // Return the final JSON string.
  return JSON.stringify(transformed);
}


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

export async function GetUserName(vuid: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/dashboard/requests/requestedUser?userId=${encodeURIComponent(vuid)}`);

    if (!res.ok) {
      console.error(`Failed to fetch username: ${res.statusText}`);
      return null;
    }

    const data = await res.json();

    return data?.username ?? null;
  } catch (err) {
    console.error("Error fetching username:", err);
    return null;
  }
}