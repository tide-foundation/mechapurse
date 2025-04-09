export async function loadCardanoWasm() {
    try {

        const CardanoWasm = await import("@emurgo/cardano-serialization-lib-nodejs");

        if (!CardanoWasm) throw new Error("Failed to load Cardano serialization library.");
        return CardanoWasm;
    } catch (error: any) {
        console.error("Error loading Cardano WASM:", error);
        throw new Error("Error loading Cardano WASM: " + error.message);
    }
}
