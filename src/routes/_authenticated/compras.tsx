import { createFileRoute } from "@tanstack/react-router";

import { ModulePlaceholder } from "@/components/page-header";

export const Route = createFileRoute("/_authenticated/compras")({
  head: () => ({
    meta: [
      { title: "Compras — Ki Delícia Gestão" },
      { name: "description", content: "Fornecedores, requisições, pedidos de compra e recebimentos." },
      { property: "og:title", content: "Compras — Ki Delícia Gestão" },
      { property: "og:description", content: "Fornecedores, requisições, pedidos de compra e recebimentos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <ModulePlaceholder
      title="Compras"
      phase="Fase 4"
      description="Fornecedores, requisições, pedidos de compra e recebimentos."
      scope={["Recebimento confirmado gera entrada de estoque e título a pagar", "Proteção contra duplicação de recebimento", "Demanda de produto revendido gera sugestão de compra, não ordem de fabricação"]}
    />
  ),
});
