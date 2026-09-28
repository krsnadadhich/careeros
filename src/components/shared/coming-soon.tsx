export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="px-8 py-16 text-center text-text3">
      <p className="text-sm font-semibold text-text2">{title} is coming next</p>
      <p className="mt-1.5 text-sm">This screen is scoped for a later phase.</p>
    </div>
  );
}
