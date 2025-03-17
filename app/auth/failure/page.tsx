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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-800 p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Validation Failed</h1>
        <p className="text-gray-600 mb-6">
          User not allowed. Please log in with a privileged account.
        </p>
        <button
          onClick={handleLogout}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
