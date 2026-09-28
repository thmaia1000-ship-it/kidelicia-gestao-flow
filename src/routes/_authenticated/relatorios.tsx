import { createFileRoute } from "@tanstack/react-router";

import { ModulePlaceholder } from "@/components/page-header";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — Ki Delícia Gestão" },
      { name: "description", content: "Relatórios por período, cliente, vendedor, canal, produto e emitente." },
      { property: "og:title", content: "Relatórios — Ki Delícia Gestão" },
      { property: "og:description", content: "Relatórios por período, cliente, vendedor, canal, produto e emitente." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <ModulePlaceholder
      title="Relatórios"
      phase="Fase 5"
      description="Relatórios por período, cliente, vendedor, canal, produto e emitente."
      scope={["Granularidade declarada: total mensal, mês/produto, mês/vendedor/produto", "Consolidado anual nunca somado ao detalhamento dos mesmos meses", "Meses sem detalhamento aparecem como “não disponível”, nunca zero", "Nenhuma margem exibida sem base de custos"]}
    />
  ),
});
