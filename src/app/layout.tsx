import type { Metadata } from "next";
import { Archivo_Black, Inter } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ToastProvider } from "@/components/Toaster";
import { ContactProvider } from "@/components/ContactProvider";
import { PwaRegister } from "@/components/PwaRegister";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const archivo = Archivo_Black({ subsets: ["latin"], weight: "400", variable: "--font-archivo", display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://yesbroker.xyz";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "YesBroker: Rental brokers in Bengaluru",
    template: "%s · YesBroker",
  },
  description:
    "A community-maintained directory of rental brokers across Bengaluru. Find brokers by area and reach them directly on WhatsApp or a call. No sign-up.",
  openGraph: {
    title: "YesBroker: Rental brokers in Bengaluru",
    description:
      "Find rental brokers in any Bengaluru locality and message them directly. Community-maintained, no accounts.",
    url: siteUrl,
    siteName: "YesBroker",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${archivo.variable}`}>
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-4KM7PVPQFG"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-4KM7PVPQFG');`}
        </Script>
      </head>
      <body className="flex min-h-dvh flex-col font-sans">
        <PwaRegister />
        <ToastProvider>
          <ContactProvider>
            <Header />
            <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-4">{children}</main>
            <Footer />
          </ContactProvider>
        </ToastProvider>
        <Analytics />
      </body>
    </html>
  );
}
