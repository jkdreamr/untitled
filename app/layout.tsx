import type { Metadata, Viewport } from "next";
import { fontVariables } from "@/lib/fonts";
import { PUBLIC_ENV } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(PUBLIC_ENV.SITE_URL),
  title: {
    default: "UNTITLED — post the take. skip everything else.",
    template: "%s · UNTITLED",
  },
  description:
    "The platform for raw, human-made art. Post the voice memo, the one-take cover, the sketchbook page. Human-made art, human-made discovery — AI never touches the work.",
  applicationName: "UNTITLED",
  // Index for press/SEO, but opt out of AI crawlers and image training.
  robots: "index, follow, noai, noimageai",
  openGraph: {
    type: "website",
    siteName: "UNTITLED",
    title: "UNTITLED — post the take. skip everything else.",
    description: "The platform for raw, human-made art. A product of NOVUM Labs.",
    url: PUBLIC_ENV.SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "UNTITLED",
    description: "The platform for raw, human-made art.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-sm focus:bg-lime focus:px-3 focus:py-2 focus:text-ink">
          skip to content
        </a>
        <div id="app-root">{children}</div>
      </body>
    </html>
  );
}
