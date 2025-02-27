"use client";

import IAMService from "@/lib/IAMService";
import { useEffect, useState } from "react";
import { GetServerSideProps } from "next";

export default function Send(){
    useEffect(() => {
        IAMService.initIAM((authenticated) => {
          if (IAMService.isLoggedIn()) {
          }
        });
      }, []);

      const handleLogout = () => {
        // Allow and handle user log out
        IAMService.doLogout();
      };

      // Create TX
      const testCreate = async () => {
        
      }


      

      // SIGN TX
      
       


      return (
        <div className="min-h-screen flex flex-col">
          <header className="bg-blue-800 shadow-md p-4">
            <div className="container mx-auto flex justify-between items-center text-white">
              <h1 className="text-2xl font-bold">Tide Wallet</h1>
              <button
                onClick={handleLogout}
                className="bg-blue-700 hover:bg-blue-600 px-4 py-2 rounded-lg"
              >
                Logout
              </button>
            </div>
          </header>
      
          <main className="flex-grow flex items-center justify-center text-white">
            <div className="bg-blue-700 rounded-xl p-6 shadow-lg backdrop-blur-sm bg-opacity-30 border border-blue-600 w-full max-w-md">
              <h2 className="text-xl font-semibold mb-4 text-center">Send ADA</h2>
              <form onSubmit={() =>{ console.log("HELLO")}} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="recipient">
                    Recipient Address
                  </label>
                  <input
                    type="text"
                    id="recipient"
                    name="recipient"
                    className="w-full px-3 py-2 text-black rounded-lg bg-white"
                    placeholder="Enter the recipient's ADA address"
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
                    placeholder="Enter the amount of ADA to send"
                    min="1"
                    step="0.000001"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="fee">
                    Transaction Fee
                  </label>
                  <input
                    type="text"
                    id="fee"
                    name="fee"
                    className="w-full px-3 py-2 text-black rounded-lg bg-white"
                    value={"100"} // This should be a state variable
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="metadata">
                    Transaction Metadata (Optional)
                  </label>
                  <textarea
                    id="metadata"
                    name="metadata"
                    className="w-full px-3 py-2 text-black rounded-lg bg-white"
                    placeholder="Enter any additional information or notes for this transaction"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-white"
                >
                  Send ADA
                </button>
              </form>
            </div>
          </main>
        </div>
      );
      
    
}