import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { supabase } from "@/integrations/supabase/client";
import { dateTimeBR } from "@/lib/fmt";
import { useMembership } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/pendencias")({
  head: () => ({
    meta: [
      { title: "Pendências — Ki Delícia Gestão" },
      {
        name: "description",
        content:
          "Lista de pendências de cadastro e importação levantadas nos arquivos de origem, aguardando confirmação humana.",
      },
      { property: "og:title", content: "Pendências — Ki Delícia Gestão" },
      { property: "og:description", content: "Pendências de cadastro e importação a confirmar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Pendencias,
});

const CONHECIDAS = [
  "As duas “SUGESTÃO DE PEDIDO OTAVIO TERRA NOVA” são binariamente idênticas: importar uma vez e registrar a outra como ignorada por hash.",
  "Códigos legados 107, 108 e 202 aparecem em produtos/descrições diferentes: não usar como chave nem fundir produtos.",
  "EANs 0040141138767 e 0040141138781 aparecem em descrições diferentes (banana chips salgada/cocada e banana chips doce/doce de leite): exigir revisão antes de ativar o mapeamento.",
  "Código 113 aparece duas vezes na mesma sugestão com preços 0,95 e 10,00: não escolher o último valor.",
  "Embalagens divergentes: pururuca 25 g x 35 g; biscoitos 70 g x 170 g; banana chips com apresentações diferentes.",
  "“CRAVALHO” (janeiro) e “CARVALHO” (dezembro) podem ser a mesma pessoa; “HELP”, “CARV” e “FÁBRICA” precisam de classificação. FÁBRICA não é presumido como pessoa.",
  "Erro de fórmula #VALUE! em I50 na sugestão Otavio: registrar ocorrência, não importar como produto nem virar zero.",
  "Consolidado anual: W6 contém “19*” — quantidade pendente de revisão.",
  "Divergências entre anual e relatório por vendedor em janeiro (polvilho 102 x 102,5; broa 711 x 112) e outras a reconciliar por produto e período.",
  "Os dois pedidos exibem VENDA 832 e PEDIDO 676 iguais: IDs internos próprios e coincidência sinalizada.",
  "Sugestão e pedido Super Nova têm o mesmo total (R$ 1.478,00) com datas e pagamentos diferentes: exigir vínculo confirmado.",
  "Vários emitentes em “FATURADO POR”: nenhum CNPJ é escolhido automaticamente.",
  "Somente janeiro e dezembro de 2025 têm detalhamento por vendedor; os outros meses ficam “não disponível”, nunca zero.",
  "Categorias ETIQ MANUEL, ETIQ TOMAS e DOCES preservadas até classificação confirmada.",
  "Total anual informado de R$ 587.706,30 é valor de origem, não auditado.",
];

function Pendencias() {
  const { data: membership } = useMembership();
  const orgId = membership?.organization?.id;

  const list = useQuery({
    queryKey: ["issues", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pending_issues")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Record<string, unknown>[];
    },
  });

  return (
    <div>
      <PageHeader
        title="Pendências"
        description="Nada aqui é corrigido automaticamente na origem. Cada item exige decisão registrada."
      />

      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm font-semibold">
          Pendências do levantamento dos arquivos (a tratar na importação — Fase 2)
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
          {CONHECIDAS.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>

      <h2 className="mt-6 mb-3 text-lg font-semibold">Pendências registradas no sistema</h2>
      <DataTable
        columns={[
          { key: "title", header: "Pendência" },
          { key: "kind", header: "Tipo" },
          { key: "severity", header: "Gravidade" },
          { key: "status", header: "Situação" },
          {
            key: "created_at",
            header: "Registro",
            value: (r) => String(r.created_at),
            render: (r) => dateTimeBR(String(r.created_at)),
          },
        ]}
        rows={list.data ?? []}
        rowKey={(r) => String(r.id)}
        loading={list.isLoading}
        emptyMessage="Nenhuma pendência registrada no banco ainda — elas passam a ser gravadas com a importação da Fase 2."
      />
    </div>
  );
}
