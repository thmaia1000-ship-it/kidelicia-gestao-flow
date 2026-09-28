import { createFileRoute } from "@tanstack/react-router";

import { ModulePlaceholder } from "@/components/page-header";

export const Route = createFileRoute("/_authenticated/producao")({
  head: () => ({
    meta: [
      { title: "Produção — Ki Delícia Gestão" },
      { name: "description", content: "Fichas técnicas versionadas, ordens de produção e apontamentos." },
      { property: "og:title", content: "Produção — Ki Delícia Gestão" },
      { property: "og:description", content: "Fichas técnicas versionadas, ordens de produção e apontamentos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <ModulePlaceholder
      title="Produção"
      phase="Fase 4"
      description="Fichas técnicas versionadas, ordens de produção e apontamentos."
      scope={["Ficha técnica com rendimento, insumos, embalagens, perdas e etapas", "Sem ficha aprovada: planejar demanda, mas bloquear consumo automático", "Apontamento gera consumo e entrada de acabado uma única vez", "Custo real apenas com insumos e custos cadastrados; senão “custo não apurado”"]}
    />
  ),
});
