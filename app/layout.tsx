import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { IntroSplash } from "@/components/IntroSplash";
import "./globals.css";

// One face across the marketing site and the app. Space Grotesk and JetBrains
// Mono used to be loaded here and referenced nowhere — two font downloads on
// every page for nothing — and General Sans came from Fontshare, a third host
// for a face the landing does not have.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://thewaveconsult.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "WaveHub",
  title: {
    default: "WaveHub",
    template: "%s · WaveHub",
  },
  description:
    "Turn bad habits into a high income skill. Real ATP analysis, early to the market. Discipline and value over hype.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "WaveHub",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0a10",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">
        <IntroSplash />
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
