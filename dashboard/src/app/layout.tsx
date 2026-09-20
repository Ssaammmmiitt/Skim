import type { Metadata } from "next";
import { Space_Mono, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Skim — Daily Tech Digest",
  description: "Agentic tech news digest dashboard",
};

const themeInitScript = `(function(){try{var t=localStorage.getItem('skim-dashboard-theme')||'dark';var r=t==='light'?'light':'dark';document.documentElement.classList.remove('light','dark');document.documentElement.classList.add(r);document.documentElement.dataset.theme=r;}catch(e){document.documentElement.classList.add('dark');}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${spaceMono.variable} ${jetbrainsMono.variable} h-full dark`}
      suppressHydrationWarning
    >
      <head>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body className="flex min-h-dvh flex-col">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
