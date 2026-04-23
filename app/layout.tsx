import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Gong Engage & Forecast — Implementation Tracker",
  description: "Program tracker for Zillow Group Gong implementation",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans min-h-screen antialiased`}>
        <ThemeProvider>
          <div className="min-h-screen bg-[var(--bg)]">
            <Nav />
            <main className="max-w-7xl mx-auto px-6 py-10">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
