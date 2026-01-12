import type { Metadata } from "next";
import { Inter, Outfit, Playfair_Display, Cormorant_Garamond, Monsieur_La_Doulaise } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });
const cormorant = Cormorant_Garamond({ 
  subsets: ["latin"], 
  weight: ['300', '400', '500', '600', '700'],
  variable: "--font-cormorant" 
});
const monsieur = Monsieur_La_Doulaise({ 
  subsets: ["latin"], 
  weight: ['400'],
  variable: "--font-monsieur" 
});

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
      <body className={`${inter.variable} ${outfit.variable} ${playfair.variable} ${cormorant.variable} ${monsieur.variable} font-sans antialiased bg-background`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
