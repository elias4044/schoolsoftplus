import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_URL = "https://ssp.elias4044.com";

export const viewport: Viewport = {
  themeColor: "#0f0f14",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),

  title: {
    default: "SchoolSoft+",
    template: "%s · SchoolSoft+",
  },
  description:
    "A fast, modern, AI-powered dashboard for your SchoolSoft account. Better UI, keyboard shortcuts, AI assistant, notes, live stats — built by a student, for students.",

  applicationName: "SchoolSoft+",
  authors: [{ name: "Elias", url: "https://github.com/elias4044" }],
  keywords: [
    "SchoolSoft",
    "SchoolSoft+",
    "school dashboard",
    "student portal",
    "schedule",
    "assignments",
    "lunch menu",
    "AI assistant",
    "Internationella Engelska Skolan",
    "IES",
  ],
  creator: "Elias",
  publisher: "Elias",

  // Open Graph
  openGraph: {
    type: "website",
    locale: "en_US",
    url: APP_URL,
    siteName: "SchoolSoft+",
    title: "SchoolSoft+ — A better student dashboard",
    description:
      "Fast, modern, AI-powered interface for your SchoolSoft account. Schedule, assignments, lunch, notes, and more.",
    images: [
      {
        url: "/social-preview.png",
        width: 1200,
        height: 630,
        alt: "SchoolSoft+ dashboard preview",
      },
    ],
  },

  // Twitter / X
  twitter: {
    card: "summary_large_image",
    title: "SchoolSoft+ — A better student dashboard",
    description:
      "Fast, modern, AI-powered interface for your SchoolSoft account.",
    images: ["/social-preview.png"],
    creator: "@elias4044",
  },

  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // Icons
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
    ],
    apple: "/icon.png",
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
      className={`${geistSans.variable} ${geistMono.variable} dark h-full`}
    >
      <body className="min-h-full antialiased">
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
