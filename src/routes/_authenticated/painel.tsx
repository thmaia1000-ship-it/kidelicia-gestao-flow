import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/page-header";
import { supabase } from "@/integrations/supabase/client";
import { brl, dateBR } from "@/lib/fmt";
import { useMembership } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Visão geral — Ki Delícia Gestão" },
      {
        name: "description",
        content: "Indicadores comerciais da operação Ki Delícia com definição e período explícitos.",
      },
      { property: "og:title", content: "Visão geral — Ki Delícia Gestão" },
      { property: "og:description", content: "Indicadores comerciais da operação Ki Delícia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Painel,
});

function Painel() {
  const { data: membership } = useMembership();
  const orgId = membership?.organization?.id;

  const resumo = useQuery({
    queryKey: ["painel", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const [clientes, produtos, prevendas, orcamentos, pedidos, pendencias] = await Promise.all([
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("organization_id", orgId!),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("organization_id", orgId!),
        supabase.from("presales").select("id, status, total").eq("organization_id", orgId!),
        supabase.from("quotes").select("id, status, total").eq("organization_id", orgId!),
        supabase
          .from("sales_orders")
          .select("id, number, status, total, order_date, customers(trade_name, legal_name)")
          .eq("organization_id", orgId!)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("pending_issues")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId!)
          .eq("status", "aberta"),
      ]);
      return {
        clientes: clientes.count ?? 0,
        produtos: produtos.count ?? 0,
        prevendas: prevendas.data ?? [],
        orcamentos: orcamentos.data ?? [],
        pedidos: pedidos.data ?? [],
        pendencias: pendencias.count ?? 0,
      };
    },
  });

  const d = resumo.data;
  const orcAprovados = (d?.orcamentos ?? []).filter((q) => q.status === "aprovado");
  const rascunhos = (d?.pedidos ?? []).filter((p) => p.status === "rascunho");

  const cards = [
    { label: "Clientes cadastrados", value: String(d?.clientes ?? 0), hint: "Cadastro ativo e inativo" },
    { label: "Produtos cadastrados", value: String(d?.produtos ?? 0), hint: "Fabricado, revendido e material" },
    {
      label: "Pré-vendas em aberto",
      value: String((d?.prevendas ?? []).filter((p) => p.status !== "convertida" && p.status !== "perdida").length),
      hint: "Rascunho, em contato ou proposta",
    },
    {
      label: "Orçamentos aprovados",
      value: String(orcAprovados.length),
      hint: `Valor proposto ${brl(orcAprovados.reduce((a, q) => a + Number(q.total), 0))}`,
    },
    {
      label: "Pedidos em rascunho",
      value: String(rascunhos.length),
      hint: "Confirmação operacional bloqueada na Fase 1",
    },
    { label: "Pendências abertas", value: String(d?.pendencias ?? 0), hint: "Conflitos e revisões de cadastro" },
  ];

  return (
    <div>
      <PageHeader
        title="Visão geral"
        description="Valores comerciais registrados no sistema. Não representam faturamento fiscal, caixa nem estoque."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-2xl font-bold">{c.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{c.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-lg border border-accent bg-accent/20 p-4 text-sm">
        <p className="font-semibold">Fase 1 em operação — limites atuais</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
          <li>
            Pedidos podem ser criados e convertidos a partir de orçamento, mas a confirmação
            operacional (reservas de estoque e títulos a receber) só é liberada na Fase 3.
          </li>
          <li>
            O histórico de 2025 e a importação das planilhas entram na Fase 2 — nenhum número
            histórico foi carregado ou inventado.
          </li>
          <li>Sem custos cadastrados, nenhuma margem ou lucro é exibido.</li>
        </ul>
      </div>

      <h2 className="mt-8 mb-3 text-lg font-semibold">Últimos pedidos</h2>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-secondary/70">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Nº</th>
              <th className="px-3 py-2 text-left font-semibold">Cliente</th>
              <th className="px-3 py-2 text-left font-semibold">Data</th>
              <th className="px-3 py-2 text-left font-semibold">Situação</th>
              <th className="px-3 py-2 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {(d?.pedidos ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                  Nenhum pedido registrado ainda.
                </td>
              </tr>
            )}
            {(d?.pedidos ?? []).map((p) => {
              const c = p.customers as unknown as { trade_name: string | null; legal_name: string } | null;
              return (
                <tr key={p.id} className="border-t">
                  <td className="px-3 py-2">
                    <Link to="/pedidos/$id" params={{ id: p.id }} className="font-medium underline">
                      {p.number}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{c?.trade_name || c?.legal_name || "—"}</td>
                  <td className="px-3 py-2">{dateBR(p.order_date)}</td>
                  <td className="px-3 py-2 capitalize">{p.status}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{brl(p.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
