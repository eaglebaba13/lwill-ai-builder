import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HDK Beauty | X Nail Business Platform",
  description:
    "Unified operating platform for HDK Beauty, X Nail and franchise operations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
