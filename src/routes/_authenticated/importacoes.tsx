import { createFileRoute } from "@tanstack/react-router";

import { ModulePlaceholder } from "@/components/page-header";

export const Route = createFileRoute("/_authenticated/importacoes")({
  head: () => ({
    meta: [
      { title: "Importações — Ki Delícia Gestão" },
      { name: "description", content: "Leitura das planilhas reais com área temporária, deduplicação e reconciliação." },
      { property: "og:title", content: "Importações — Ki Delícia Gestão" },
      { property: "og:description", content: "Leitura das planilhas reais com área temporária, deduplicação e reconciliação." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <ModulePlaceholder
      title="Importações"
      phase="Fase 2"
      description="Leitura das planilhas reais com área temporária, deduplicação e reconciliação."
      scope={["Detecção de layout sem presumir cabeçalho na primeira linha", "Hash do arquivo para identificar duplicidade e importação idempotente", "Conflitos de código, EAN, preço e embalagem resolvidos com aprovação", "Nenhuma importação histórica movimenta caixa ou estoque"]}
    />
  ),
});
