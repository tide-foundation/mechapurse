"use client";

import "@/styles/app.css";
import Image from "next/image";
import LogoImage from "@/styles/img/logo_transparent.png";

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
    <div
      className="layout-container"
      style={{
        background: "url('/styles/img/background_circuit.svg') no-repeat center center",
        backgroundSize: "cover",
      }}
    >
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div
            className="logo-title"
            onClick={() => router.push("/authenticated/dashboard")}
          >
            {/* Uncomment below if you want to show the logo image */}
            {/* <Image
              src={LogoImage}
              alt="Mechapurse Logo"
              width={40}
              height={40}
              className="logoOutline"
            /> */}
            <h1>MECHAPURSE</h1>
          </div>
          <nav className="header-nav">
            {hasRole("tide-realm-admin", "realm-management") && (
              <NavButton
                onClick={() => router.push("/authenticated/admin")}
                icon={<FaUserShield />}
                text="Admin"
              />
            )}
            <NavButton
              onClick={() => router.push("/authenticated/dashboard")}
              icon={<FaHome />}
              text="Dashboard"
            />
            <NavButton
              onClick={() => router.push("/authenticated/transactions/send")}
              icon={<FaPaperPlane />}
              text="Send"
            />
            <NavButton
              onClick={() => router.push("/authenticated/transactions/history")}
              icon={<FaHistory />}
              text="History"
            />
            <NavButton onClick={handleLogout} icon={<FaSignOutAlt />} text="Logout" />
          </nav>
        </div>
      </header>

      {/* Page Content */}
      <main className="app-dashboard">{children}</main>
    </div>
  );
}

const NavButton = ({
  onClick,
  icon,
  text,
  large = false,
}: {
  onClick: () => void;
  icon: JSX.Element;
  text: string;
  large?: boolean;
}) => (
  <button onClick={onClick} className={`nav-button ${large ? "large" : ""}`}>
    {icon} <span>{text}</span>
  </button>
);
