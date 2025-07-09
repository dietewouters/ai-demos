import type { Metadata } from "next";
import "./globals.css";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "AI, course at KU Leuven",
  description:
    "This is a webpage containing demos for the course AI at KU Leuven",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="nl">
      <body className={`${inter.className} bg-gray-50 text-gray-900`}>
        {/* Centrerende wrapper */}
        <main className="min-h-screen flex items-center justify-center">
          {children}
        </main>
      </body>
    </html>
  );
}
