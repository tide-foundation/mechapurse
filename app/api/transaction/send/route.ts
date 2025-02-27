import { NextRequest, NextResponse } from "next/server";
import { createTransactionBuilder } from "@/lib/transactionBuilderConfig"
import * as CardanoWasm from '@emurgo/cardano-serialization-lib-browser';


export async function POST(req: NextRequest){
    try {
        const txBuilder: CardanoWasm.TransactionBuilder = await createTransactionBuilder();
        
        // calcutate Address here
        



    }catch(err){
        console.error("❌ [SERVER] Error signing tx:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}