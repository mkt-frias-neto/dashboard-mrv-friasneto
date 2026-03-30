import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dashboard Meta Ads | MRV x Frias Neto",
  description: "Dashboard de campanhas Meta Ads - MRV em parceria com Frias Neto",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
