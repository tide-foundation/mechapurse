"use client";

import { useState, useEffect } from "react";
import IAMService from "@/lib/IAMService";

export default function Send() {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionResult, setTransactionResult] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    IAMService.initIAM((authenticated) => {
      console.log("[DEBUG] IAMService.initIAM() finished. Authenticated:", authenticated);
      if (IAMService.isLoggedIn()) {
        setIsLoading(false);
      }
    });
  }, []);

  const handleLogout = () => {
    IAMService.doLogout();
  };

  const cardanoAddressRegex = /^(addr|addr_test)1[0-9a-z]+$/;

  const testCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setTransactionResult(null);

    if (!recipient.trim()) {
      setError("Recipient address is required.");
      return;
    }

    if (!cardanoAddressRegex.test(recipient)) {
      setError("Invalid recipient address format. Must be a valid Cardano address.");
      return;
    }

    if (!amount.trim()) {
      setError("Amount is required.");
      return;
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError("Amount must be a valid number greater than 0.");
      return;
    }

    try {
      const token = await IAMService.getToken();
      const response = await fetch("/api/transaction/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ recipient, amount }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Transaction failed");

      setTransactionResult(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-blue-800 shadow-md p-4">
        <div className="container mx-auto flex justify-between items-center text-white">
          <h1 className="text-2xl font-bold">Tide Wallet</h1>
          <button onClick={handleLogout} className="bg-blue-700 hover:bg-blue-600 px-4 py-2 rounded-lg">
            Logout
          </button>
        </div>
      </header>
      {isLoading ? (
        <div className="flex-grow flex items-center justify-center">
          <div className="relative">
            <div className="h-16 w-16 border-4 border-blue-500 border-solid rounded-full animate-spin border-t-transparent"></div>
          </div>
        </div>
      ) : (
        <main className="flex-grow flex items-center justify-center text-white">
          <div className="bg-blue-700 rounded-xl p-6 shadow-lg backdrop-blur-sm bg-opacity-30 border border-blue-600 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4 text-center">Send ADA</h2>
            <form onSubmit={testCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="recipient">
                  Recipient Address
                </label>
                <input
                  type="text"
                  id="recipient"
                  name="recipient"
                  className="w-full px-3 py-2 text-black rounded-lg bg-white"
                  placeholder="Enter recipient's ADA address"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="amount">
                  Amount (ADA)
                </label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  className="w-full px-3 py-2 text-black rounded-lg bg-white"
                  placeholder="Enter amount"
                  min="1"
                  step="0.000001"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-white">
                Send ADA
              </button>
            </form>

            {transactionResult && (
              <div className="mt-4 p-3 bg-gray-800 text-white rounded-lg">
                <h3 className="text-md font-bold">Transaction Preview:</h3>
                <pre className="text-sm break-words whitespace-pre-wrap">{JSON.stringify(transactionResult, null, 2)}</pre>
              </div>
            )}

            {error && <p className="text-red-500 mt-4">{error}</p>}
          </div>
        </main>
      )}
    </div>
  );
}
