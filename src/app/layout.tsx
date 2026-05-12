import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import { DM_Sans, Space_Mono } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AttendSync — Biometric Attendance Management",
  description: "Real-time attendance management system with biometric device integration",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${dmSans.variable} ${spaceMono.variable}`}>
      <body className="bg-slate-950 text-slate-100 antialiased font-sans min-h-screen">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#1e293b",
              color: "#f1f5f9",
              border: "1px solid #334155",
              borderRadius: "8px",
              fontSize: "14px",
            },
          }}
        />
      </body>
    </html>
  );
}
