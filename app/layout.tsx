import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ReactBitsCursor from "@/components/ReactBitsCursor";
import BackgroundMusic from "@/components/BackgroundMusic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LOGIN 2K26 // DC Movie Blind Coding Arena",
  description: "High-stakes blind coding platform with DC Tamil 2026 Movie DSA problems.",
  icons: {
    icon: "/bc_logo.png",
    shortcut: "/bc_logo.png",
    apple: "/bc_logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col bg-[#070709] text-[#f5f5f7] font-sans selection:bg-[#ff204e33] selection:text-[#ff3864]">
        <ReactBitsCursor />
        <BackgroundMusic />
        {children}
      </body>
    </html>
  );
}

