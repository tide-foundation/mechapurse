const protocolParams = {
    linearFee: {
        minFeeA: "44",
        minFeeB: "155381",
    },
    minUtxo: "34482",
    poolDeposit: "500000000",
    keyDeposit: "2000000",
    maxValSize: 5000,
    maxTxSize: 16384,
    priceMem: 0.0577,
    priceStep: 0.0000721,
    coinsPerUtxoByte: "4310", // Updated to coinsPerUtxoByte
};

// Function to create and return a configured TransactionBuilder instance
export async function createTransactionBuilder() {
    const CardanoWasm = await import("@emurgo/cardano-serialization-lib-browser"); // Dynamic import

    // Define the linear fee parameters
    const linearFee = CardanoWasm.LinearFee.new(
        CardanoWasm.BigNum.from_str(protocolParams.linearFee.minFeeA),
        CardanoWasm.BigNum.from_str(protocolParams.linearFee.minFeeB)
    );

    // Build the transaction builder configuration
    const txBuilderCfg = CardanoWasm.TransactionBuilderConfigBuilder.new()
        .fee_algo(linearFee)
        .pool_deposit(CardanoWasm.BigNum.from_str(protocolParams.poolDeposit))
        .key_deposit(CardanoWasm.BigNum.from_str(protocolParams.keyDeposit))
        .max_value_size(protocolParams.maxValSize)
        .max_tx_size(protocolParams.maxTxSize)
        .coins_per_utxo_byte(CardanoWasm.BigNum.from_str(protocolParams.coinsPerUtxoByte)) // Updated parameter
        .prefer_pure_change(true)
        .build();

    // Create and return the TransactionBuilder instance
    return CardanoWasm.TransactionBuilder.new(txBuilderCfg);
}
