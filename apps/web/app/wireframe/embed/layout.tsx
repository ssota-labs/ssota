export default function WireframeEmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background h-dvh w-dvw overflow-hidden">{children}</div>
  );
}
