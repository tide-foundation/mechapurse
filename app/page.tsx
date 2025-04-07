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
        <main className="flex flex-col items-center justify-center min-h-screen px-6 py-12 w-full font-['Orbitron'] bg-[var(--color-grey)]">
            <div className="w-full max-w-lg bg-[var(--color-white)] text-[var(--color-dark)] rounded-xl p-8 shadow-2xl border border-[var(--color-dark)] text-center flex flex-col justify-center min-h-[300px] ">
                <h1 className="text-5xl font-bold pb-6 tracking-wider text-[var(--color-dark)] !pb-4">
                    MECHAPURSE
                </h1>
                <button
                    onClick={handleLogin}
                    className="w-64 h-14 bg-[var(--color-blue)] text-white font-bold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg self-center py-4 hover:brightness-90"
                >
                    Login
                </button>
                <p className="pt-10 text-sm text-[#8E8E8E] !pt-4">
                    Keys That Never Exist - Security That Always Does.
                </p>
            </div>
        </main>
    );
}
