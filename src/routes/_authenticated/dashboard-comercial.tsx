import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  ShoppingCart,
  Users,
  FileCheck,
  AlertCircle,
  Clock,
  ArrowRight,
  Plus,
  Package,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { brl, dateBR } from "@/lib/fmt";
import { useMembership } from "@/lib/session";
import { CommercialStore } from "@/lib/commercial-store";

export const Route = createFileRoute("/_authenticated/dashboard-comercial")({
  head: () => ({
    meta: [
      { title: "Dashboard Comercial — Ki Delícia Gestão" },
      {
        name: "description",
        content: "Carteira, propostas, pedidos e desempenho comercial de vendas Ki Delícia.",
      },
      { property: "og:title", content: "Dashboard Comercial — Ki Delícia Gestão" },
      {
        property: "og:description",
        content: "Carteira, propostas, pedidos e desempenho de vendas Ki Delícia.",
      },
    ],
  }),
  component: DashboardComercial,
});

function DashboardComercial() {
  const { data: membership } = useMembership();
  const orgId = membership?.organization?.id;
  const isVendedor =
    membership?.roles.includes("comercial") &&
    !membership?.roles.includes("administrador") &&
    !membership?.roles.includes("gestor");
  const userEmail = membership?.email || "";

  const [periodo, setPeriodo] = useState<"mes" | "trimestre" | "ano">("mes");
  const [selectedSalesperson, setSelectedSalesperson] = useState<string>("todos");

  // Dados do banco Supabase
  const query = useQuery({
    queryKey: ["dashboard-comercial", orgId, selectedSalesperson],
    enabled: !!orgId,
    queryFn: async () => {
      const [prevendasRes, orcamentosRes, pedidosRes, clientesRes, salespeopleRes] =
        await Promise.all([
          supabase
            .from("presales")
            .select("id, number, status, total, date, prospect_name, salesperson_id")
            .eq("organization_id", orgId!),
          supabase
            .from("quotes")
            .select("id, number, status, total, date, valid_until, customer_id, salesperson_id")
            .eq("organization_id", orgId!),
          supabase
            .from("sales_orders")
            .select(
              "id, number, status, total, order_date, production_status, shipping_status, customer_id, salesperson_id, customers(trade_name, legal_name)",
            )
            .eq("organization_id", orgId!)
            .order("order_date", { ascending: false }),
          supabase
            .from("customers")
            .select("id, legal_name, trade_name, active")
            .eq("organization_id", orgId!),
          supabase.from("salespeople").select("id, name, active").eq("organization_id", orgId!),
        ]);

      return {
        prevendas: prevendasRes.data || [],
        orcamentos: orcamentosRes.data || [],
        pedidos: pedidosRes.data || [],
        clientes: clientesRes.data || [],
        vendedores: salespeopleRes.data || [],
      };
    },
  });

  const d = query.data;
  const positions = orgId ? CommercialStore.getStockPositions(orgId) : [];
  const reservations = orgId ? CommercialStore.getReservations(orgId) : [];

  // Filtragem de pedidos
  const pedidos = d?.pedidos || [];
  const orcamentos = d?.orcamentos || [];
  const prevendas = d?.prevendas || [];

  // Pedidos confirmados (reais)
  const pedidosConfirmados = pedidos.filter((p) => p.status === "confirmado");
  const pedidosRascunho = pedidos.filter((p) => p.status === "rascunho");

  // Métricas comerciais
  const totalVendidoConfirmado = pedidosConfirmados.reduce((acc, p) => acc + Number(p.total), 0);
  const qtdPedidosConfirmados = pedidosConfirmados.length;
  const ticketMedio =
    qtdPedidosConfirmados > 0 ? totalVendidoConfirmado / qtdPedidosConfirmados : 0;

  // Orçamentos aguardando resposta
  const orcAguardando = orcamentos.filter((q) => q.status === "enviado" || q.status === "rascunho");
  const orcAprovados = orcamentos.filter((q) => q.status === "aprovado");

  // Pedidos com falta de estoque aguardando indústria
  const activeShortages = reservations.filter((r) => r.status === "ativa" && r.qtyShortageBase > 0);

  // Produtos mais demandados no estoque
  const produtosAbaixoMinimo = positions.filter((p) => p.available < p.minStock);

  return (
    <div className="space-y-6">
      {/* Header com identidade e atalhos rápidos */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-[#ED1C24] px-2 py-0.5 text-xs font-black text-white">
              ÁREA COMERCIAL
            </span>
            <span className="text-xs text-muted-foreground">
              {isVendedor ? `Carteira Individual (${userEmail})` : "Visão Consolidada de Vendas"}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#202124]">Dashboard Comercial</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhamento de pré-vendas, orçamentos, pedidos de venda e entregas da Ki Delícia.
          </p>
        </div>

        {/* Atalhos rápidos de venda */}
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/pre-vendas">
              <Plus className="mr-1 size-4" /> Nova Pré-Venda
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/orcamentos">
              <Plus className="mr-1 size-4" /> Novo Orçamento
            </Link>
          </Button>
          <Button asChild size="sm" className="bg-[#B5121B] hover:bg-[#8f0d14] text-white">
            <Link to="/pedidos">
              <ShoppingCart className="mr-1 size-4" /> Novo Pedido
            </Link>
          </Button>
        </div>
      </div>

      {/* Indicadores Comerciais */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Valor Pedidos Confirmados */}
        <div className="rounded-xl border bg-card p-4 shadow-sm border-l-4 border-l-[#ED1C24]">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pedidos Confirmados
            </p>
            <TrendingUp className="size-4 text-[#ED1C24]" />
          </div>
          <p className="mt-2 text-2xl font-black text-[#202124]">{brl(totalVendidoConfirmado)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {qtdPedidosConfirmados} pedidos fechados
          </p>
        </div>

        {/* Card 2: Ticket Médio Operacional */}
        <div className="rounded-xl border bg-card p-4 shadow-sm border-l-4 border-l-[#202124]">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ticket Médio
            </p>
            <ShoppingCart className="size-4 text-[#202124]" />
          </div>
          <p className="mt-2 text-2xl font-black text-[#202124]">{brl(ticketMedio)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Média por pedido confirmado</p>
        </div>

        {/* Card 3: Orçamentos em Aberto */}
        <div className="rounded-xl border bg-card p-4 shadow-sm border-l-4 border-l-[#FFEA00]">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Propostas / Orçamentos
            </p>
            <FileCheck className="size-4 text-[#d97706]" />
          </div>
          <p className="mt-2 text-2xl font-black text-[#202124]">{orcAguardando.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {orcAprovados.length} aprovados prontos para pedido
          </p>
        </div>

        {/* Card 4: Faltas de Estoque em Pedidos */}
        <div className="rounded-xl border bg-card p-4 shadow-sm border-l-4 border-l-[#d97706]">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Aguardando Indústria
            </p>
            <AlertCircle className="size-4 text-[#d97706]" />
          </div>
          <p className="mt-2 text-2xl font-black text-[#d97706]">{activeShortages.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Itens de pedidos com falta de estoque
          </p>
        </div>
      </div>

      {/* Alerta de Disponibilidade do Estoque Comercial */}
      {produtosAbaixoMinimo.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-4 text-sm text-amber-900 flex items-start gap-3">
          <AlertCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">
              Atenção Comercial: {produtosAbaixoMinimo.length} produto(s) com estoque disponível
              abaixo do mínimo
            </p>
            <p className="mt-0.5 text-xs text-amber-800">
              {produtosAbaixoMinimo
                .map((p) => `${p.description} (Disp: ${p.available} ${p.baseUnit})`)
                .join(" · ")}
              . Recomenda-se emitir ordem à indústria para reposição antes do próximo ciclo de
              vendas.
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="shrink-0 bg-white">
            <Link to="/producao">Ver Ordens à Indústria</Link>
          </Button>
        </div>
      )}

      {/* Grid de 2 Colunas: Propostas Recentes & Últimos Pedidos de Venda */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Painel Esquerdo: Pedidos Comerciais Recentes */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="font-bold text-base text-[#202124]">Últimos Pedidos de Venda</h2>
              <p className="text-xs text-muted-foreground">Situação comercial e logística</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/pedidos" className="text-xs font-semibold text-[#B5121B]">
                Ver todos <ArrowRight className="ml-1 size-3" />
              </Link>
            </Button>
          </div>

          <div className="mt-3 divide-y">
            {pedidos.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Nenhum pedido de venda lançado ainda.
              </div>
            ) : (
              pedidos.slice(0, 5).map((p) => {
                const c = p.customers as unknown as {
                  trade_name: string | null;
                  legal_name: string;
                } | null;
                const clientName = c?.trade_name || c?.legal_name || "Cliente não informado";
                return (
                  <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          to="/pedidos/$id"
                          params={{ id: p.id }}
                          className="font-bold text-sm text-[#202124] hover:underline"
                        >
                          Pedido #{p.number}
                        </Link>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                            p.status === "confirmado"
                              ? "bg-green-100 text-green-800"
                              : p.status === "cancelado"
                                ? "bg-red-100 text-red-800"
                                : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground mt-0.5">
                        {clientName} · {dateBR(p.order_date)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-[#202124]">{brl(p.total)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {p.shipping_status === "concluido" ? "Expedido" : "Aguardando expedição"}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Painel Direito: Orçamentos & Propostas em Andamento */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="font-bold text-base text-[#202124]">Orçamentos e Propostas</h2>
              <p className="text-xs text-muted-foreground">Propostas em negociação com clientes</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/orcamentos" className="text-xs font-semibold text-[#B5121B]">
                Ver todos <ArrowRight className="ml-1 size-3" />
              </Link>
            </Button>
          </div>

          <div className="mt-3 divide-y">
            {orcamentos.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Nenhum orçamento registrado no momento.
              </div>
            ) : (
              orcamentos.slice(0, 5).map((q) => (
                <div key={q.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        to="/orcamentos/$id"
                        params={{ id: q.id }}
                        className="font-bold text-sm text-[#202124] hover:underline"
                      >
                        Orçamento #{q.number}
                      </Link>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                          q.status === "aprovado"
                            ? "bg-green-100 text-green-800"
                            : q.status === "enviado"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {q.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Data: {dateBR(q.date)}
                      {q.valid_until && ` · Válido até ${dateBR(q.valid_until)}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-[#202124]">{brl(q.total)}</p>
                    <span className="text-[10px] text-muted-foreground">
                      {q.status === "aprovado" ? "Pronto para pedido" : "Em análise"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Tabela de Disponibilidade Comercial Rápida */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <Package className="size-5 text-[#B5121B]" />
            <div>
              <h2 className="font-bold text-base text-[#202124]">
                Disponibilidade Imediata para Venda
              </h2>
              <p className="text-xs text-muted-foreground">
                Posição do estoque para consulta ágil pelo vendedor antes de fechar pedidos
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/estoque">Ver Detalhes do Estoque</Link>
          </Button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-[#F5F6F8] text-xs font-semibold text-[#202124]">
                <th className="px-3 py-2.5">Código / SKU</th>
                <th className="px-3 py-2.5">Produto Acabado</th>
                <th className="px-3 py-2.5">Apresentação</th>
                <th className="px-3 py-2.5 text-right">Físico</th>
                <th className="px-3 py-2.5 text-right">Reservado</th>
                <th className="px-3 py-2.5 text-right font-bold text-[#1e7e34]">Disponível</th>
                <th className="px-3 py-2.5 text-right text-blue-700">Previsto Indústria</th>
                <th className="px-3 py-2.5 text-center">Status Venda</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {positions.map((p) => {
                const fardosDisponiveis = (p.available / p.factorToBase).toFixed(1);
                return (
                  <tr key={p.productId} className="hover:bg-muted/30">
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{p.sku}</td>
                    <td className="px-3 py-2.5 font-medium text-[#202124]">{p.description}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {p.commercialUnit} c/ {p.factorToBase} {p.baseUnit}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {p.physical} {p.baseUnit}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-amber-700">
                      {p.reserved} {p.baseUnit}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-bold text-[#1e7e34]">
                      {p.available} {p.baseUnit}
                      <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                        (~{fardosDisponiveis} fardos)
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-blue-700">
                      {p.inTransit > 0 ? `+${p.inTransit} ${p.baseUnit}` : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {p.available <= 0 ? (
                        <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800">
                          Sem Estoque
                        </span>
                      ) : p.available < p.minStock ? (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          Estoque Baixo
                        </span>
                      ) : (
                        <span className="rounded bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-800">
                          Pronta Entrega
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
