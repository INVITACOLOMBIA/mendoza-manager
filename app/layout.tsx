import type { Metadata } from "next";
import "./globals.css";
import { AuthGuard } from "@/components/AuthGuard";

export const metadata: Metadata = {
  title: "Mendoza Manager",
  description: "Sistema de gestión Mendoza Manager",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}
