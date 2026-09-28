import { createFileRoute } from "@tanstack/react-router";

import { ModulePlaceholder } from "@/components/page-header";

export const Route = createFileRoute("/_authenticated/estoque")({
  head: () => ({
    meta: [
      { title: "Estoque — Ki Delícia Gestão" },
      { name: "description", content: "Saldo físico, reservado, bloqueado e disponível por produto, local e lote." },
      { property: "og:title", content: "Estoque — Ki Delícia Gestão" },
      { property: "og:description", content: "Saldo físico, reservado, bloqueado e disponível por produto, local e lote." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <ModulePlaceholder
      title="Estoque"
      phase="Fase 3"
      description="Saldo físico, reservado, bloqueado e disponível por produto, local e lote."
      scope={["Disponível = físico − reservado − bloqueado", "Razão imutável de movimentos com origem, lote e usuário", "Reserva somente de saldo disponível; faltante vira demanda pendente", "Baixa única na expedição, com entregas parciais por item"]}
    />
  ),
});
