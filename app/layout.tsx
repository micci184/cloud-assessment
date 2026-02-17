import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cloud Assessment",
  description: "AWSカリキュラム向け理解度テストWebアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
      >
        <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6">
          <header className="mb-8 flex items-center justify-between rounded-2xl border border-black/10 bg-white/80 px-4 py-3 backdrop-blur dark:border-white/15 dark:bg-black/50">
            <Link href="/" className="text-sm font-semibold tracking-wide">
              Cloud Assessment
            </Link>
            <nav className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-300">
              <Link href="/login">Login</Link>
              <Link href="/select">Select</Link>
              <Link href="/me">Me</Link>
            </nav>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
