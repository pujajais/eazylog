import type { Metadata, Viewport } from "next";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import "./globals.css";

export const metadata: Metadata = {
  title: "EazyLog — Symptom Tracker",
  description: "A gentle symptom tracker for chronic pain patients. Log how you feel with voice, taps, or touch.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "EazyLog",
  },
};

export const viewport: Viewport = {
  themeColor: "#5B8C7B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.svg" />
      </head>
      <body className="antialiased bg-cream-100 min-h-screen">
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
