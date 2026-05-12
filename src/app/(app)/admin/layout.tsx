export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="px-4 py-8">{children}</div>;
}
