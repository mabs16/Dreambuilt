import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "DREAMBUILT OS | Control Tower",
  description: "Sales Control System for High Performance Teams",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className="font-sans antialiased bg-background" suppressHydrationWarning>
        <div className={`${inter.variable} ${outfit.variable} flex h-screen overflow-hidden`}>
          <Sidebar />
          <main className="flex-1 relative overflow-y-auto bg-background focus:outline-none">
            <div className="mx-auto min-h-screen max-w-7xl px-4 py-4 sm:px-6 md:py-8 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
