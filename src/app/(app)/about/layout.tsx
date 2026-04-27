export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="mx-auto max-w-2xl px-4 py-8">{children}</div>;
}
