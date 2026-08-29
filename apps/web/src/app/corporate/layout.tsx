import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LWILL — AI Builder Platform",
  description:
    "LWILL ecosystem: AI Builder, multi-tenant platform, CRM, inventory, finance, and industry applications.",
};

export default function CorporateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="corporate-theme">{children}</div>;
}
