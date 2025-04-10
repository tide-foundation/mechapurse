import fs from "fs";
import path from "path";

const progressPath = path.resolve(".setup-progress");

export function saveSetupStep(step: number) {
    fs.writeFileSync(progressPath, step.toString(), "utf-8");
}

export function getSetupStep(): number {
    if (!fs.existsSync(progressPath)) return 0;
    return parseInt(fs.readFileSync(progressPath, "utf-8").trim() || "0", 10);
}

export function clearSetupStep() {
    if (fs.existsSync(progressPath)) fs.unlinkSync(progressPath);
}
