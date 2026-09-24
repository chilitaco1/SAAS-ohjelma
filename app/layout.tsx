import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import type { ReactNode } from "react";

import { APP_DESCRIPTION, APP_NAME } from "@/lib/brand";

import "./globals.css";

const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="fi" className={`${sans.variable} h-full scroll-smooth antialiased`}>
      <body className="min-h-full bg-background text-foreground">{children}</body>
    </html>
  );
}
