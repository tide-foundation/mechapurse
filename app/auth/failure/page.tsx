"use client";

import IAMService from "@/lib/IAMService";
import { useEffect } from "react";

export default function FailedPage() {
  // If user is authenticated but without proper credentials, present this page
  useEffect(() => {
    IAMService.initIAM();
  }, []);

  const handleLogout = () => {
    // Allow user to log out and start over
    IAMService.doLogout();
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center !p-4"
      style={{
        background: "linear-gradient(135deg, var(--color-blue) 0%, #1a237e 100%)"
      }}
    >
      <div className="bg-[var(--color-white)] rounded-lg shadow-2xl !p-8 max-w-md w-full text-center border border-[var(--color-dark)]">
        <h1 className="text-3xl font-bold text-[var(--color-dark)] mb-4">Validation Failed</h1>
        <p className="text-[var(--color-dark)] mb-6">
          User not allowed. Please log in with a privileged account.
        </p>
        <button
          onClick={handleLogout}
          className="px-6 py-2 bg-[var(--color-blue)] hover:brightness-90 text-white rounded-lg transition"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
