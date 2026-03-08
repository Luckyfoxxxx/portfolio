import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { TRPCProvider } from "../lib/trpc/client";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Portfolio Tracker",
  description: "Personal investment portfolio tracker",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geist.variable} font-sans antialiased bg-gray-950 text-gray-50 min-h-screen`}>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded focus:bg-white focus:p-3 focus:text-gray-950">Skip to content</a>
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
