import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function ModulePlaceholder({
  title,
  phase,
  description,
  scope,
}: {
  title: string;
  phase: string;
  description: string;
  scope: string[];
}) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <div className="rounded-lg border border-dashed bg-card p-6">
        <span className="inline-flex rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
          Não implementado — {phase}
        </span>
        <p className="mt-4 text-sm text-muted-foreground">
          Este módulo ainda não grava dados. Nada aqui movimenta estoque, caixa ou títulos, e nenhuma
          ação de sucesso é simulada.
        </p>
        <p className="mt-4 text-sm font-semibold">Escopo previsto:</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
          {scope.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
