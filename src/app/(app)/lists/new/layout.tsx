import type { Metadata } from "next";

export const metadata: Metadata = { title: "New list" };

export default function NewListLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
