import type { Metadata } from "next";
import { Noto_Sans, Playfair_Display, Space_Grotesk } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const notoSans = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-noto-sans",
});

export const metadata: Metadata = {
  title: "ENOS One",
  description:
    "One workspace for AI agents with working money — bring any model, set the rules, approve what matters.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${playfair.variable} ${spaceGrotesk.variable} ${notoSans.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
