import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "X Nail | Operations",
  description: "X Nail operational dashboard.",
};

export default function XnailLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="xnail-theme">{children}</div>;
}
