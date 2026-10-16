import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import Providers from "@/components/providers";

const inter = Inter({ subsets: ["latin"], display: "swap" });
const STORE_NAME = process.env.NEXT_PUBLIC_STORE_NAME ?? "Storefront";

export const metadata: Metadata = {
  title: { default: STORE_NAME, template: `%s · ${STORE_NAME}` },
  description: "Quality products, honest prices, and delivery you can count on.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} flex min-h-screen flex-col bg-white text-gray-900 antialiased`}>
        <a
          href="#main"
          className="sr-only z-50 rounded-lg bg-white px-4 py-2 font-semibold text-indigo-700 shadow focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to main content
        </a>
        <Providers>
          <Navbar />
          <main id="main" className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
