// app/api/setup/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
    getAdminToken,
    createRealm,
    setUpTideRealm,
    updateCustomAdminUIDomain,
    approveAndCommitClients,
    createAdminUser,
    fetchAdapterConfig,
} from "@/lib/setup/TidecloakInitRealm";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { saveRealmName, getRealmName, clearRealmName } from "@/lib/setup/realmStore";
import { saveSetupStep, getSetupStep, clearSetupStep } from "@/lib/setup/setupProgress";
import { approveAndCommitUsers } from "@/lib/setup/TidecloakInitRealm";


const tidecloakPath = path.resolve("tidecloak.json");
const realmJsonPath = path.resolve("realm.json");
const codespaceUrl = process.env.CODESPACE_URL || "http://localhost:3000";

export async function GET(req: NextRequest) {
    try {
        const step = req.nextUrl.searchParams.get("step") ?? "0";

        if (step === "0") {
            // Check progress
            const current = getSetupStep();
            if (current >= 6) {
                return NextResponse.json({
                    message: "⏳ Setup paused after step 6, waiting for user to link account.",
                    paused: true,
                    done: false,
                });
            }

            // Check if setup was completed by checking tidecloak.json
            try {
                const config = (await import("../../../tidecloak.json")) as Record<string, any>;
                const required = ["jwk", "vendorId", "homeOrkUrl"];
                const hasAll = required.every((key) => config[key]);
                if (hasAll) {
                    return NextResponse.json({ message: "✅ Setup already completed.", done: true });
                }
            } catch (e) { }

            return NextResponse.json({ message: "🧪 Setup required.", done: false });
        }

        const token = await getAdminToken();
        let log = "";
        let inviteLink = "";

        switch (step) {
            case "1": {
                const newRealm = `mechapurse-${randomUUID()}`;
                saveRealmName(newRealm);

                let realmJson = fs.readFileSync(realmJsonPath, "utf-8");
                realmJson = realmJson.replace(/http:\/\/localhost:3000/g, codespaceUrl);
                realmJson = realmJson.replace(/nextjs-test/g, newRealm);
                fs.writeFileSync(realmJsonPath, realmJson);
                log = `📄 Generated realm: ${newRealm}`;
                saveSetupStep(Number(step));
                break;
            }

            case "2": {
                const realm = getRealmName();
                await createRealm(token, realmJsonPath);
                log = `🌍 Realm '${realm}' created.`;
                saveSetupStep(Number(step));
                break;
            }

            case "3": {
                const realm = getRealmName();
                await setUpTideRealm(token, realm);
                log = "🔐 Tide realm initialized and IGA enabled.";
                saveSetupStep(Number(step));
                break;
            }

            case "4": {
                const realm = getRealmName();
                await updateCustomAdminUIDomain(token, realm, codespaceUrl);
                log = "🌐 CustomAdminUIDomain updated.";
                saveSetupStep(Number(step));
                break;
            }

            case "5": {
                const realm = getRealmName();
                await approveAndCommitClients(token, realm);
                log = "✅ Client context approved and committed.";
                saveSetupStep(Number(step));
                break;
            }

            case "6": {
                const realm = getRealmName();
                inviteLink = await createAdminUser(token, realm);
                log = `👤 User created. Invite link: ${inviteLink}`;
                saveSetupStep(Number(step));
                break;
            }

            case "7": {
                const realm = getRealmName();
                await approveAndCommitUsers(token, realm);
                log = "✅ User context approved and committed.";
                saveSetupStep(Number(step));
                break;
            }

            case "8": {
                const realm = getRealmName();
                await fetchAdapterConfig(token, realm, "mechapurse", tidecloakPath);
                log = "📥 Adapter config fetched and saved.";
                clearSetupStep();
                break;
            }

            // case "8": {
            //     clearRealmName();
            //     log = "🎉 Setup complete!";
            //     saveSetupStep(Number(step));
            //     break;
            // }

            default:
                clearSetupStep();
                return NextResponse.json({ error: "Invalid step." }, { status: 400 });
        }

        return NextResponse.json({ success: true, step: Number(step), log });
    } catch (error: any) {
        clearSetupStep();
        return NextResponse.json({ error: error.message || "Unknown setup error" }, { status: 500 });
    }
}
