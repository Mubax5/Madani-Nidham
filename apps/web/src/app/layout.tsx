import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/components/app-providers";

export const metadata: Metadata = {
  title: "Madani Nidham",
  description: "Dashboard akademik Madani Montessori Islamic School",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
