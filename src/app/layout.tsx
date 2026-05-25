import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import { ThemeInit } from "@/components/theme-init";
import "./globals.css";

export const metadata: Metadata = {
  title: "Paw Dojo",
  description: "Focus. Tricks. Treats.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Space+Grotesk:wght@300..700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-surface dark:bg-dark-base text-[#1E1A16] dark:text-gray-100 antialiased">
        <a href="#main-content" className="skip-to-content">
          Skip to content
        </a>
        <Providers>
          <ThemeInit />
          <main id="main-content">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
