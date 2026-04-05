import type { Metadata } from "next";
import { Manrope, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

import { AppFooter } from "@/components/AppFooter";
import { AppHeader } from "@/components/AppHeader";

// Material Symbols Outlined — used for iconography per the Stitch design system.
// Self-hosted via Google Fonts CSS link; no tracking.
const MATERIAL_SYMBOLS_URL =
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0..1,0&display=swap";

const manrope = Manrope({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  // metadataBase makes icon and OG image URLs absolute when platforms scrape
  // them. Uses the production domain by default; override via env for previews.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://munmind.me"
  ),
  title: {
    default: "MUN MIND — a private space to check in with yourself",
    template: "%s — MUN MIND",
  },
  description:
    "An anonymous mental health check-in companion for Memorial University students. No login, no judgment, no appointment needed.",
  openGraph: {
    title: "MUN MIND — a private space to check in with yourself",
    description:
      "Anonymous mental health check-in for MUN students. No login, no judgment, no appointment needed.",
    siteName: "MUN MIND",
    type: "website",
    locale: "en_CA",
  },
  twitter: {
    card: "summary_large_image",
    title: "MUN MIND — a private space to check in with yourself",
    description:
      "Anonymous mental health check-in for MUN students. No login, no judgment, no appointment needed.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${plusJakarta.variable} h-full antialiased`}
    >
      <head>
        <link rel="stylesheet" href={MATERIAL_SYMBOLS_URL} />
      </head>
      <body className="min-h-full flex flex-col">
        <AppHeader />
        <main className="flex-1 flex flex-col">{children}</main>
        <AppFooter />
      </body>
    </html>
  );
}
