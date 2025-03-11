"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useRef, JSX } from "react";
import {
    FaHome,
    FaPaperPlane,
    FaHistory,
    FaCog,
    FaBars,
    FaTimes,
    FaSignOutAlt,
    FaUserCircle
} from "react-icons/fa";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();

    const [menuOpen, setMenuOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);

    const profileMenuRef = useRef<HTMLDivElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);
    const burgerButtonRef = useRef<HTMLButtonElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setProfileOpen(false);
            }

            if (
                mobileMenuRef.current &&
                !mobileMenuRef.current.contains(event.target as Node) &&
                burgerButtonRef.current &&
                !burgerButtonRef.current.contains(event.target as Node)
            ) {
                setMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Hide navbar on login page (`/`)
    if (pathname === "/") {
        return <main className="w-full">{children}</main>;
    }

    return (
        <div className="h-screen flex flex-col">
            {/* Navbar */}
            <header className="bg-gradient-to-b from-blue-900 to-blue-800 shadow-md p-4 text-white fixed w-full z-50">
                <div className="container mx-auto flex justify-between items-center px-4">
                    {/* Logo */}
                    <h1
                        className="text-2xl font-bold cursor-pointer hover:text-[#4DA8DA] transition-all flex items-center"
                        onClick={() => router.push("/authenticated/account")}
                    >
                        Tide Wallet
                    </h1>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex space-x-6 items-center">
                        <NavButton onClick={() => router.push("/authenticated/account")} icon={<FaHome />} text="Dashboard" />
                        <NavButton onClick={() => router.push("/authenticated/transactions/send")} icon={<FaPaperPlane />} text="Send" />
                        <NavButton onClick={() => router.push("/authenticated/transactions/history")} icon={<FaHistory />} text="History" />

                        {/* Profile Dropdown */}
                        <div className="relative" ref={profileMenuRef}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setProfileOpen((prev) => !prev);
                                }}
                                className="hover:text-[#4DA8DA] transition-all flex items-center space-x-2"
                            >
                                <FaUserCircle className="text-2xl" /> <span>Profile</span>
                            </button>

                            {/* Profile Dropdown Menu */}
                            {profileOpen && (
                                <DropdownMenu>
                                    <DropdownItem onClick={() => router.push("/settings")} icon={<FaCog />} text="Settings" />
                                    <DropdownItem onClick={() => router.push("/logout")} icon={<FaSignOutAlt />} text="Logout" isLogout />
                                </DropdownMenu>
                            )}
                        </div>
                    </nav>

                    {/* Mobile Menu Button */}
                    <button ref={burgerButtonRef} className="md:hidden text-xl" onClick={() => setMenuOpen((prev) => !prev)}>
                        {menuOpen ? <FaTimes /> : <FaBars />}
                    </button>
                </div>

                {/* Mobile Navigation Menu */}
                {menuOpen && (
                    <div
                        ref={mobileMenuRef}
                        className="md:hidden fixed top-0 left-0 w-full h-full bg-blue-900 z-50 flex flex-col p-6 transition-transform duration-300"
                    >
                        {/* Close Button */}
                        <button
                            onClick={() => setMenuOpen(false)}
                            className="self-end text-white text-3xl hover:text-[#4DA8DA] transition"
                        >
                            <FaTimes />
                        </button>

                        {/* Menu Items */}
                        <nav className="flex flex-col space-y-6 mt-12 text-center">
                            <NavButton onClick={() => router.push("/authenticated/account")} icon={<FaHome />} text="Dashboard" large />
                            <NavButton onClick={() => router.push("/authenticated/transactions/send")} icon={<FaPaperPlane />} text="Send" large />
                            <NavButton onClick={() => router.push("/authenticated/transactions/history")} icon={<FaHistory />} text="History" large />
                            <NavButton onClick={() => router.push("/settings")} icon={<FaCog />} text="Settings" large />
                        </nav>

                        {/* Logout Button */}
                        <button
                            onClick={() => router.push("/logout")}
                            className="w-full mt-auto bg-blue-500 hover:bg-[#4DA8DA] text-white px-6 py-4 rounded-xl flex items-center justify-center space-x-3 transition-all duration-300 text-xl"
                        >
                            <FaSignOutAlt /> <span>Logout</span>
                        </button>
                    </div>
                )}
            </header>

            {/* Page Content */}
            <main className="flex-1 mt-16 p-6">{children}</main>
        </div>
    );
}


const NavButton = ({ onClick, icon, text, large = false }: { onClick: () => void, icon: JSX.Element, text: string, large?: boolean }) => (
    <button
        onClick={onClick}
        className={`hover:text-[#4DA8DA] transition-all flex items-center space-x-2 ${large ? "text-2xl justify-center" : ""}`}
    >
        {icon} <span>{text}</span>
    </button>
);

const DropdownMenu = ({ children }: { children: React.ReactNode }) => (
    <div className="absolute right-0 mt-3 bg-blue-800 text-white rounded-lg shadow-lg p-3 w-40">
        {children}
    </div>
);

const DropdownItem = ({ onClick, icon, text, isLogout = false }: { onClick: () => void, icon: JSX.Element, text: string, isLogout?: boolean }) => (
    <button
        onClick={onClick}
        className={`hover:text-[#4DA8DA] transition-all flex items-center space-x-2 w-full py-2 ${isLogout ? "bg-blue-500 hover:bg-[#4DA8DA] text-white px-4 py-2 rounded-lg justify-center" : ""}`}
    >
        {icon} <span>{text}</span>
    </button>
);
