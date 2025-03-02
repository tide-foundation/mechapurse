"use client";

import IAMService from "@/lib/IAMService";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function Home() {
    useEffect(() => {
        const init = async () => {
            await IAMService.initIAM((authenticated) => {
                if (authenticated) {
                    window.location.href = "/auth/redirect";
                }
            });
        }
        init()
    }, []);


    const handleLogin = (e: { preventDefault: () => void; }) => {
        e.preventDefault();
        IAMService.doLogin();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-800 text-white font-sans">
            <div className="flex flex-col items-center justify-center min-h-screen p-4">
                <div className="w-full max-w-md">
                    <div className="text-center mb-12">
                        <h1 className="text-5xl font-bold mb-2">Tide Wallet</h1>
                    </div>

                    <div className="bg-blue-700 rounded-xl shadow-2xl p-8 backdrop-blur-sm bg-opacity-30 border border-blue-600">
                        {/* <h2 className="text-2xl font-semibold mb-6 text-center">
                          Welcome to Your Crypto Kingdom
                      </h2> */}
                        {/* <p className="text-blue-200 mb-8 text-center">
                          Manage your digital assets
                      </p> */}

                        <div className="space-y-4">
                            <button
                                onClick={handleLogin}
                                className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-blue-900 font-bold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
                            >
                                Login to Wallet
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
