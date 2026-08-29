import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LWILL AI Builder",
  description:
    "AI-assisted application builder platform.",
};

export default function BuilderLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="builder-theme">{children}</div>;
}
