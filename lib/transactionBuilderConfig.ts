import * as CardanoWasm from '@emurgo/cardano-serialization-lib-browser';

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
    coinsPerUtxoWord: "34482",
}

// Function to create and return a configured TransactionBuilder instance
export async function createTransactionBuilder(): Promise<CardanoWasm.TransactionBuilder> {
    // Define the linear fee parameters (these values are network-specific)
    const linearFee = CardanoWasm.LinearFee.new(
        CardanoWasm.BigNum.from_str(protocolParams.linearFee.minFeeA),       // Minimum fee coefficient
        CardanoWasm.BigNum.from_str(protocolParams.linearFee.minFeeB)    // Minimum fee constant
    );

    // Build the transaction builder configuration
    const txBuilderCfg = CardanoWasm.TransactionBuilderConfigBuilder.new()
        .fee_algo(linearFee)
        .pool_deposit(CardanoWasm.BigNum.from_str(protocolParams.poolDeposit)) // Pool deposit
        .key_deposit(CardanoWasm.BigNum.from_str(protocolParams.keyDeposit))    // Key deposit
        .max_value_size(protocolParams.maxValSize)                                   // Max value size
        .max_tx_size(protocolParams.maxTxSize)
        .prefer_pure_change(true)
        .build();

    // Create and return the TransactionBuilder instance
    return CardanoWasm.TransactionBuilder.new(txBuilderCfg);
}
