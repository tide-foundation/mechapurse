// app/layout.tsx
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";
import { AuthProvider } from "@/components/AuthContext";
import SetupOverlay from "@/components/SetupOverlay";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen text-white font-sans flex flex-col">

        <SetupOverlay>
          <AuthProvider>
            <ClientLayout>{children}</ClientLayout>
          </AuthProvider>
        </SetupOverlay>
      </body>
    </html>
  );
}
