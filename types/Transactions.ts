export interface Transaction {
    tx_hash: string;
    amount: string;
    block_time: string;
    direction: "Sent" | "Received";
    status: "Success" | "Pending";
}

export interface TxOutput {
    address: string;
    value: number; // ADA value in lovelace
}

export interface TxInput {
    address: string;
}
