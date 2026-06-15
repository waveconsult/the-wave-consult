import { Brand } from "@/components/Brand";
import { ComplianceFooter } from "@/components/ResponsibleGambling";

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
            A tennis betting analysis tool. Discipline and Closing Line Value
            over hype — not a bookmaker.
          </p>
        </div>
        <div className="card card-emphasis p-6">{children}</div>
      </div>
      <ComplianceFooter />
    </div>
  );
}
