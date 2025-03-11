"use client";

import IAMService from "@/lib/IAMService";
import { useEffect } from "react";

export default function Home() {
    useEffect(() => {
        const init = async () => {
            await IAMService.initIAM((authenticated) => {
                if (authenticated) {
                    window.location.href = "/auth/redirect";
                }
            });
        };
        init();
    }, []);

    const handleLogin = () => {
        IAMService.doLogin();
    };

    return (
        <main className="flex flex-col items-center justify-center min-h-screen px-6 py-12 w-full font-['Inter'] bg-gradient-to-b from-blue-900 to-blue-800">
            <div className="w-full max-w-lg bg-gradient-to-b from-[#1E3A8A] to-[#233A73] rounded-xl p-8 shadow-lg border border-blue-700 text-white text-center">
                {/* Wallet Logo */}
                <h1 className="text-5xl font-bold mb-6">Tide Wallet</h1>

                {/* Login Button */}
                <button
                    onClick={handleLogin}
                    className="w-full py-4 bg-[#2979FF] hover:bg-[#1E6AE1] text-white font-bold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                    Login to Wallet
                </button>

                {/* Tagline */}
                <p className="mt-6 text-blue-300 text-sm">
                    Securely manage your Cardano assets.
                </p>
            </div>
        </main>
    );
}
