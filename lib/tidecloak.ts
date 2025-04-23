// Use CommonJS require to load heimdall's exports
import heimdall = require("@/external/tidecloak-js/lib/heimdall");

export const base64ToBytes = heimdall.base64ToBytes;
export const bytesToBase64 = heimdall.bytesToBase64;
export const getHumanReadableObject = heimdall.getHumanReadableObject;
