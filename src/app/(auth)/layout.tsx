export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="bg-surface-elevated border-border w-full max-w-md rounded-lg border p-8 shadow-sm">
        {children}
      </div>
    </main>
  );
}
