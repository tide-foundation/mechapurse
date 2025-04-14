import { NextRequest, NextResponse } from "next/server";
import { verifyTideCloakToken } from "@/lib/tideJWT";
import { Roles } from "@/app/constants/roles";
import { cookies } from "next/headers";
import { GetAllDraftSignRequests, GetDraftSignRequestAuthorizations, GetUsernameForUserId } from "@/lib/db";
import { AdminAuthorizationPack } from "@/interfaces/interface";

const allowedRoles = [Roles.User, Roles.Admin];

export async function GET(req: NextRequest) {
    try {
        // Verify authorization token
        const cookieStore = cookies();
        const token = (await cookieStore).get("kcToken")?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await verifyTideCloakToken(token, allowedRoles);
        if (!user) throw new Error("Invalid token");

        const signReqDrafts = GetAllDraftSignRequests();


        const drafts = await Promise.all(signReqDrafts.map( async (draft) => {
            const username = GetUsernameForUserId(draft.userId);
            const authPacks: AdminAuthorizationPack[] = await GetDraftSignRequestAuthorizations(draft.id);
            const authorizations = Promise.all(authPacks.map(async (auth) => {
                    const username = await GetUsernameForUserId(auth.userId);
                    return {...auth, username: username }
                }));
            const logs = await Promise.all((await authorizations).map(a => {
                return {
                    username: a.username,
                    action: a.rejected ? "Rejected" : "Approved"
                }
            }))
            
            return {
                ...draft,
                username: username,
                authPacks: authorizations,
                logs: logs
            }

        }))
        
        return NextResponse.json({ drafts }); // send the drafts in response
    } catch (err) {
        console.error("Internal Server Error:", err);
        return NextResponse.json({ error: "Internal Server Error: " + err }, { status: 500 });
    }
}
