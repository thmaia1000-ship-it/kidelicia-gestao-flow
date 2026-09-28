import { createFileRoute } from "@tanstack/react-router";

import { ModulePlaceholder } from "@/components/page-header";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro — Ki Delícia Gestão" },
      { name: "description", content: "Contas a receber e a pagar, parcelas, recebimentos e contas financeiras." },
      { property: "og:title", content: "Financeiro — Ki Delícia Gestão" },
      { property: "og:description", content: "Contas a receber e a pagar, parcelas, recebimentos e contas financeiras." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <ModulePlaceholder
      title="Financeiro"
      phase="Fase 3"
      description="Contas a receber e a pagar, parcelas, recebimentos e contas financeiras."
      scope={["Parcelas somando exatamente o total financiado, com resíduo na última", "Recebimento parcial, estorno com motivo e reabertura do saldo correto", "Estado importado como “não informado — conciliar”", "Sem integração bancária ou fiscal: NF, documento e boleto são referências manuais"]}
    />
  ),
});
