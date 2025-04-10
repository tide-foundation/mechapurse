import fs from "fs";
import path from "path";

const setupCompletePath = path.resolve(".setup-complete");

export const markSetupComplete = () => {
  fs.writeFileSync(setupCompletePath, "true", "utf-8");
};

export const isSetupComplete = (): boolean => {
  return fs.existsSync(setupCompletePath);
};

export const clearSetupState = () => {
  if (fs.existsSync(setupCompletePath)) fs.unlinkSync(setupCompletePath);
};
