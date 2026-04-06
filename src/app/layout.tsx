import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "Emerge — Investment Analyst",
  description: "Investment analyst dashboard for market intelligence, stock tracking, meetings, and deal pipeline",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Sidebar />
        <main className="ml-56 min-h-screen transition-all duration-200">
          {children}
        </main>
      </body>
    </html>
  );
}
