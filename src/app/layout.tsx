import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { TickerTape } from "@/components/layout/TickerTape";

export const metadata: Metadata = {
  title: "Emerge — It Girl Terminal",
  description: "The Bloomberg terminal, but make it fashion",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <TickerTape />
        <Sidebar />
        <main className="ml-56 min-h-screen transition-all duration-200">
          {children}
        </main>
      </body>
    </html>
  );
}
