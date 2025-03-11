"use client";

import IAMService from "@/lib/IAMService";
import { useEffect } from "react";
export default function FailedPage() {
  // If user authenticated but without proper credentials, present this page
  useEffect(() => {
    IAMService.initIAM();
  }, []);

  const handleLogout = () => {
    // Allow user to log out and start over
    IAMService.doLogout();
  };

  return (
    <div>
      <h1>Validation failed</h1>
      <p>User not allowed. Log in with a priviledged user.</p>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}