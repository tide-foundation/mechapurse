import fs from "fs";
import path from "path";

const realmStorePath = path.resolve(".realm-name");

export const saveRealmName = (realm: string) => {
    fs.writeFileSync(realmStorePath, realm, "utf-8");
};

export const getRealmName = (): string => {
    return fs.existsSync(realmStorePath) ? fs.readFileSync(realmStorePath, "utf-8").trim() : "";
};

export const clearRealmName = () => {
    if (fs.existsSync(realmStorePath)) fs.unlinkSync(realmStorePath);
};
