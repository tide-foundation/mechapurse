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
        <main className="flex flex-col items-center justify-center min-h-screen px-6 py-12 w-full font-['Orbitron'] bg-[#EDEDED] bg-circuit-pattern">
            <div className="w-full max-w-lg bg-[#F5F5F0]/90 text-[#404040] rounded-xl p-8 shadow-2xl border border-[#A0A0A0] text-center flex flex-col justify-center min-h-[300px]">

                <h1 className="text-5xl font-bold !pb-6 text-[#2C2C2C] tracking-wider">MECHAPURSE</h1>

                <button
                    onClick={handleLogin}
                    className="w-64 h-14 bg-[#D32F2F] hover:bg-[#A0A0A0] text-white font-bold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg self-center py-4"
                >
                    Login
                </button>

                <p className="!pt-10 text-[#8E8E8E] text-s">
                    Keys That Never Exist - Security That Always Does.
                </p>
            </div>
        </main>
    );
}
