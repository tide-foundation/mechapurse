"use client";
import IAMService from "@/lib/IAMService";
import { useEffect, useState } from "react";

export default function Account(){

    useEffect(() => {
        IAMService.initIAM((authenticated) => {
        });
      }, []);
    const handleLogout = () => {
        // Allow and handle user log out
        IAMService.doLogout();
      };

    return (
        <div className="min-h-screen flex flex-col">
                    <header className="bg-blue-800 shadow-md p-4 text-white" >
                        <div className="container mx-auto flex justify-between items-center">
                            <h1 className="text-2xl font-bold">Tide Wallet</h1>
                            <button
                                onClick={handleLogout}
                                className="bg-blue-700 hover:bg-blue-600 px-4 py-2 rounded-lg"
                            >
                                Logout
                            </button>
                        </div>
                    </header>

                    <main className="flex-grow container mx-auto p-4 text-white">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                <div className="bg-blue-700 rounded-xl p-6 shadow-lg backdrop-blur-sm bg-opacity-30 border border-blue-600">
                                    <h2 className="text-xl font-semibold mb-4">Total Balance</h2>
                                    <div className="flex items-baseline">
                                        <button onClick={()=>{
                                            window.location.href = "/authenticated/transactions/send";
                                        }}> SEND </button>
                                    </div>
                                </div>

                                <div className="bg-blue-700 rounded-xl p-6 shadow-lg backdrop-blur-sm bg-opacity-30 border border-blue-600">
                                    <h2 className="text-xl font-semibold mb-4">Assets</h2>
                                    <div className="space-y-4">                            
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
    )
}