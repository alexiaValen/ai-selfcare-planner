import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Self-Care Planner",
  description: "Your personalized wellness companion with AI-powered self-care recommendations, mood tracking, and social challenges.",
  keywords: ["self-care", "wellness", "mental health", "AI", "mindfulness", "meditation"],
  authors: [{ name: "AI Self-Care Team" }],
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#FFE4E6",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "AI Self-Care Planner",
    description: "Your personalized wellness companion with AI-powered self-care recommendations",
    type: "website",
    locale: "en_US",
    siteName: "AI Self-Care Planner",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Self-Care Planner",
    description: "Your personalized wellness companion with AI-powered self-care recommendations",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#FFE4E6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="AI Self-Care" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <Providers>
          <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
