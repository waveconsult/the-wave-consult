import { Brand } from "@/components/Brand";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-6 py-10">
      <div className="flex flex-1 flex-col justify-center">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Brand size={36} />
          <p className="max-w-xs text-sm text-muted">
            Turn bad habits into a high income skill. Real ATP analysis,
            discipline over hype.
          </p>
        </div>
        <div className="card card-emphasis p-6">{children}</div>
      </div>
    </div>
  );
}
