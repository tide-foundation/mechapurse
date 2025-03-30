"use client";

import "@/styles/vaultless.css";

import IAMService from "@/lib/IAMService";
import { useRouter, usePathname } from "next/navigation";
import { useState, JSX } from "react";
import {
    FaHome,
    FaPaperPlane,
    FaHistory,
    FaSignOutAlt,
    FaUserShield,
} from "react-icons/fa";
import { useAuth } from "@/components/AuthContext";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { hasRole } = useAuth();

    const [menuOpen, setMenuOpen] = useState(false);

    const handleLogout = async () => {
        await IAMService.doLogout();
    };

    if (pathname === "/" || pathname === "/auth/failure") {
        return <main className="w-full">{children}</main>;
    }

    return (
        <div className="h-screen flex flex-col">
            {/* Navbar  bg-gradient-to-b from-[#0A0A0C] to-[#1A1C20] 1e3a8a  1e40af*/}
            <header className="bg-gradient-to-b from-[#0A0A0C] to-[#1A1C20] shadow-md p-4 text-white fixed w-full z-50 h-16 border-b border-[#4DA8DA33]">
                <div className="container mx-auto flex justify-between items-center px-4">
                    {/* Logo */}
                    <h1
                        className="text-2xl font-bold cursor-pointer hover:text-[#4DA8DA] transition-all tracking-wide uppercase"
                        onClick={() => router.push("/authenticated/dashboard")}
                    >
                        Vaultless
                    </h1>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex space-x-6 items-center">
                        {hasRole("tide-realm-admin", "realm-management") && (
                            <NavButton onClick={() => router.push("/authenticated/admin")} icon={<FaUserShield />} text="Admin" />
                        )}
                        <NavButton onClick={() => router.push("/authenticated/dashboard")} icon={<FaHome />} text="Dashboard" />
                        <NavButton onClick={() => router.push("/authenticated/transactions/send")} icon={<FaPaperPlane />} text="Send" />
                        <NavButton onClick={() => router.push("/authenticated/transactions/history")} icon={<FaHistory />} text="History" />
                        <NavButton onClick={handleLogout} icon={<FaSignOutAlt />} text="Logout" />
                    </nav>
                </div>
            </header>

            {/* Page Content */}
            <main className="bg-[#e5e7eb] flex-1 h-[calc(100vh-4rem)] mt-16 overflow-hidden">
                {children}
            </main>
        </div>
    );
}

const NavButton = ({ onClick, icon, text, large = false }: { onClick: () => void; icon: JSX.Element; text: string; large?: boolean }) => (
    <button
        onClick={onClick}
        className={`hover:text-[#4DA8DA] transition-all flex items-center space-x-2 ${large ? "text-2xl justify-center" : ""}`}
    >
        {icon} <span>{text}</span>
    </button>
);
