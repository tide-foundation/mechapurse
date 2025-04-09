import "./globals.css";
import ClientLayout from "@/components/ClientLayout";
import { AuthProvider } from "@/components/AuthContext";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen text-white font-sans flex flex-col">
        <AuthProvider>
          <ClientLayout>{children}</ClientLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
