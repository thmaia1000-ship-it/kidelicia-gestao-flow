import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  ShoppingCart,
  Package,
  Factory,
  AlertTriangle,
  Clock,
  ArrowRight,
  Plus,
  Truck,
  CheckCircle2,
  FileText,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { brl, dateBR } from "@/lib/fmt";
import { useMembership } from "@/lib/session";
import { CommercialStore } from "@/lib/commercial-store";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Dashboard Administrativo — Ki Delícia Gestão" },
      {
        name: "description",
        content:
          "Visão consolidada da operação comercial da Ki Delícia: pedidos, estoque, ordens à indústria e pendências.",
      },
      { property: "og:title", content: "Dashboard Administrativo — Ki Delícia Gestão" },
      { property: "og:description", content: "Visão consolidada da operação Ki Delícia." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PainelAdmin,
});

function PainelAdmin() {
  const { data: membership } = useMembership();
  const orgId = membership?.organization?.id;

  const [periodo, setPeriodo] = useState<"mes" | "trimestre" | "ano">("mes");

  const query = useQuery({
    queryKey: ["painel-admin", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const [clientesRes, produtosRes, prevendasRes, orcamentosRes, pedidosRes, pendenciasRes] =
        await Promise.all([
          supabase
            .from("customers")
            .select("id, legal_name, trade_name", { count: "exact" })
            .eq("organization_id", orgId!),
          supabase
            .from("products")
            .select("id, sku, description, min_stock", { count: "exact" })
            .eq("organization_id", orgId!),
          supabase.from("presales").select("id, status, total").eq("organization_id", orgId!),
          supabase.from("quotes").select("id, status, total").eq("organization_id", orgId!),
          supabase
            .from("sales_orders")
            .select(
              "id, number, status, total, order_date, production_status, shipping_status, customers(trade_name, legal_name)",
            )
            .eq("organization_id", orgId!)
            .order("created_at", { ascending: false }),
          supabase
            .from("pending_issues")
            .select("id, title, details, severity, status, kind, created_at")
            .eq("organization_id", orgId!)
            .eq("status", "aberta"),
        ]);

      return {
        clientesCount: clientesRes.count ?? 0,
        produtosCount: produtosRes.count ?? 0,
        prevendas: prevendasRes.data ?? [],
        orcamentos: orcamentosRes.data ?? [],
        pedidos: pedidosRes.data ?? [],
        pendencias: pendenciasRes.data ?? [],
      };
    },
  });

  const d = query.data;
  const positions = orgId ? CommercialStore.getStockPositions(orgId) : [];
  const ordersIndustria = orgId ? CommercialStore.getOrders(orgId) : [];
  const reservations = orgId ? CommercialStore.getReservations(orgId) : [];

  // Pedidos
  const pedidos = d?.pedidos ?? [];
  const pedidosConfirmados = pedidos.filter((p) => p.status === "confirmado");
  const pedidosRascunho = pedidos.filter((p) => p.status === "rascunho");
  const pedidosAguardandoExpedicao = pedidosConfirmados.filter(
    (p) => p.shipping_status !== "concluido",
  );

  // Totais comerciais
  const totalConfirmado = pedidosConfirmados.reduce((a, p) => a + Number(p.total), 0);
  const ticketMedio =
    pedidosConfirmados.length > 0 ? totalConfirmado / pedidosConfirmados.length : 0;

  // Ordens à indústria em aberto
  const ordensAbertas = ordersIndustria.filter(
    (o) => o.industryStatus !== "encerrada" && o.industryStatus !== "cancelada",
  );
  const ordensEntregasParciais = ordensAbertas.filter((o) =>
    o.items.some((i) => i.fulfillmentStatus === "parcial"),
  );

  // Produtos abaixo do estoque mínimo
  const produtosAbaixoMinimo = positions.filter((p) => p.available < p.minStock);

  // Pedidos com falta de estoque (aguardando produtos da indústria)
  const activeShortages = reservations.filter((r) => r.status === "ativa" && r.qtyShortageBase > 0);

  return (
    <div className="space-y-6">
      {/* Top Header com identificação e alternador de Dashboards */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-[#202124] px-2 py-0.5 text-xs font-black text-[#FFEA00]">
              ADMINISTRAÇÃO
            </span>
            <span className="text-xs font-semibold text-[#B5121B]">
              Ki Delícia Gestão Comercial
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#202124] mt-1">
            Dashboard Administrativo
          </h1>
          <p className="text-sm text-muted-foreground">
            Visão executiva integrada: vendas, estoque físico, ordens à indústria e pendências.
          </p>
        </div>

        {/* Ações e Alternância de Visão */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-[#ED1C24] text-[#B5121B] hover:bg-red-50"
          >
            <Link to="/dashboard-comercial">
              Alternar para Dashboard Comercial <ArrowRight className="ml-1 size-3.5" />
            </Link>
          </Button>

          <Button asChild size="sm" className="bg-[#B5121B] hover:bg-[#8f0d14] text-white">
            <Link to="/pedidos">
              <ShoppingCart className="mr-1 size-4" /> Nova Venda
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="border-[#202124]">
            <Link to="/producao">
              <Factory className="mr-1 size-4" /> Nova Ordem à Indústria
            </Link>
          </Button>
        </div>
      </div>

      {/* Grid de Métricas Executivas Principais */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* Card 1: Pedidos Confirmados */}
        <div className="rounded-xl border bg-card p-4 shadow-sm border-t-4 border-t-[#ED1C24]">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Pedidos Confirmados
          </p>
          <p className="mt-1 text-2xl font-black text-[#202124]">{brl(totalConfirmado)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {pedidosConfirmados.length} pedidos no período
          </p>
        </div>

        {/* Card 2: Ticket Médio Operacional */}
        <div className="rounded-xl border bg-card p-4 shadow-sm border-t-4 border-t-[#202124]">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Ticket Médio
          </p>
          <p className="mt-1 text-2xl font-black text-[#202124]">{brl(ticketMedio)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Média operacional</p>
        </div>

        {/* Card 3: Pendentes de Expedição */}
        <div className="rounded-xl border bg-card p-4 shadow-sm border-t-4 border-t-[#FFEA00]">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Aguardando Expedição
          </p>
          <p className="mt-1 text-2xl font-black text-[#202124]">
            {pedidosAguardandoExpedicao.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Prontos ou em separação</p>
        </div>

        {/* Card 4: Faltas em Pedidos */}
        <div className="rounded-xl border bg-card p-4 shadow-sm border-t-4 border-t-amber-500">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Falta de Estoque
          </p>
          <p className="mt-1 text-2xl font-black text-amber-700">{activeShortages.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Pedidos aguardando indústria</p>
        </div>

        {/* Card 5: Ordens à Indústria Abertas */}
        <div className="rounded-xl border bg-card p-4 shadow-sm border-t-4 border-t-blue-600">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Ordens à Indústria
          </p>
          <p className="mt-1 text-2xl font-black text-blue-700">{ordensAbertas.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {ordensEntregasParciais.length} com entregas parciais
          </p>
        </div>

        {/* Card 6: Abaixo do Mínimo */}
        <div className="rounded-xl border bg-card p-4 shadow-sm border-t-4 border-t-red-500">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Abaixo do Mínimo
          </p>
          <p className="mt-1 text-2xl font-black text-red-700">{produtosAbaixoMinimo.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Produtos em nível crítico</p>
        </div>
      </div>

      {/* Regra de Negócio: Operação Comercial com Indústria Parceira */}
      <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 text-sm text-[#202124]">
        <div className="flex items-center gap-2 font-bold text-[#B5121B]">
          <Factory className="size-4" />
          <span>Modelo Comercial Ki Delícia & Indústria Fornecedora</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          O comércio solicita produtos acabados à indústria parceira por{" "}
          <strong>ordens de produção</strong>. Ordens em andamento ou "prontas"{" "}
          <strong>não aumentam o estoque disponível</strong> até que o recebimento seja conferido
          com quantidades aceitas. Ao confirmar pedidos de venda, o estoque disponível é reservado
          de imediato; eventuais faltas são alocadas para atendimento prioritário na entrega da
          indústria.
        </p>
      </div>

      {/* 2 Colunas: Lista Prática de Pendências & Ordens à Indústria em Aberto */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Coluna 1: Lista Prática de Ações e Pendências Operacionais */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-600" />
              <div>
                <h2 className="font-bold text-base text-[#202124]">Pendências Operacionais</h2>
                <p className="text-xs text-muted-foreground">
                  Ações que requerem atenção da gestão
                </p>
              </div>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/pendencias" className="text-xs font-semibold text-[#B5121B]">
                Ver todas <ArrowRight className="ml-1 size-3" />
              </Link>
            </Button>
          </div>

          <div className="mt-3 space-y-2.5">
            {/* Pendência 1: Produtos abaixo do mínimo */}
            {produtosAbaixoMinimo.map((p) => (
              <div
                key={p.productId}
                className="flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-amber-50/40 text-xs"
              >
                <div>
                  <span className="font-bold text-amber-900">{p.description}</span>
                  <p className="text-muted-foreground mt-0.5">
                    Estoque disponível:{" "}
                    <strong className="text-red-700">
                      {p.available} {p.baseUnit}
                    </strong>{" "}
                    (Mínimo: {p.minStock})
                  </p>
                </div>
                <Button asChild size="sm" variant="outline" className="h-7 text-xs bg-white">
                  <Link to="/producao">Solicitar à Indústria</Link>
                </Button>
              </div>
            ))}

            {/* Pendência 2: Pedidos aguardando produtos */}
            {activeShortages.slice(0, 3).map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-3 rounded-lg border border-red-200 bg-red-50/40 text-xs"
              >
                <div>
                  <span className="font-bold text-red-900">Pedido #{s.orderNumber}</span>
                  <p className="text-muted-foreground mt-0.5">
                    Aguardando recebimento de{" "}
                    <strong className="text-red-700">{s.qtyShortageBase} UN</strong> do item
                  </p>
                </div>
                <Button asChild size="sm" variant="outline" className="h-7 text-xs bg-white">
                  <Link to="/pedidos">Ver Pedido</Link>
                </Button>
              </div>
            ))}

            {produtosAbaixoMinimo.length === 0 && activeShortages.length === 0 && (
              <div className="py-6 text-center text-xs text-muted-foreground">
                <CheckCircle2 className="mx-auto size-6 text-green-600 mb-1" />
                Nenhuma pendência operacional crítica no momento.
              </div>
            )}
          </div>
        </div>

        {/* Coluna 2: Ordens à Indústria em Aberto e Recebimentos */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <Factory className="size-5 text-[#B5121B]" />
              <div>
                <h2 className="font-bold text-base text-[#202124]">Ordens à Indústria em Aberto</h2>
                <p className="text-xs text-muted-foreground">
                  Solicitações de produtos acabados à fábrica parceira
                </p>
              </div>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/producao" className="text-xs font-semibold text-[#B5121B]">
                Gerenciar <ArrowRight className="ml-1 size-3" />
              </Link>
            </Button>
          </div>

          <div className="mt-3 divide-y">
            {ordensAbertas.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Nenhuma ordem à indústria em andamento no momento.
              </div>
            ) : (
              ordensAbertas.map((o) => {
                const totalBase = o.items.reduce((acc, i) => acc + i.qtyBase, 0);
                const totalAccepted = o.items.reduce((acc, i) => acc + i.qtyAcceptedBase, 0);
                const pct = totalBase > 0 ? Math.round((totalAccepted / totalBase) * 100) : 0;

                return (
                  <div key={o.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#202124]">{o.orderNumber}</span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                            o.industryStatus === "em_producao"
                              ? "bg-blue-100 text-blue-800"
                              : o.industryStatus === "pronta"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {o.industryStatus.replace("_", " ")}
                        </span>
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-700 uppercase">
                          {o.priority}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-1">
                        Previsão fábrica:{" "}
                        {o.confirmedDate ? dateBR(o.confirmedDate) : dateBR(o.solicitedDate)} ·{" "}
                        {o.items.length} itens ({totalBase} un)
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-bold text-[#202124]">
                        {totalAccepted} / {totalBase} un
                      </p>
                      <p className="text-[10px] text-muted-foreground">{pct}% atendido</p>
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="mt-1 h-6 text-[10px] bg-white"
                      >
                        <Link to="/producao">Conferir Recebimento</Link>
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Tabela dos Últimos Pedidos de Venda */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="size-5 text-[#B5121B]" />
            <div>
              <h2 className="font-bold text-base text-[#202124]">Últimos Pedidos de Venda</h2>
              <p className="text-xs text-muted-foreground">
                Valores reais registrados no sistema com cliente, data e situação
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/pedidos">Ver Todos os Pedidos</Link>
          </Button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-[#F5F6F8] text-xs font-semibold text-[#202124]">
                <th className="px-3 py-2.5">Nº</th>
                <th className="px-3 py-2.5">Cliente</th>
                <th className="px-3 py-2.5">Data Pedido</th>
                <th className="px-3 py-2.5">Situação Comercial</th>
                <th className="px-3 py-2.5">Expedição</th>
                <th className="px-3 py-2.5 text-right">Total</th>
                <th className="px-3 py-2.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pedidos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-sm text-muted-foreground">
                    Nenhum pedido de venda registrado ainda.
                  </td>
                </tr>
              ) : (
                pedidos.slice(0, 8).map((p) => {
                  const c = p.customers as unknown as {
                    trade_name: string | null;
                    legal_name: string;
                  } | null;
                  return (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2.5 font-bold">
                        <Link
                          to="/pedidos/$id"
                          params={{ id: p.id }}
                          className="text-[#B5121B] hover:underline"
                        >
                          #{p.number}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-[#202124]">
                        {c?.trade_name || c?.legal_name || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{dateBR(p.order_date)}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs font-bold uppercase ${
                            p.status === "confirmado"
                              ? "bg-green-100 text-green-800"
                              : p.status === "cancelado"
                                ? "bg-red-100 text-red-800"
                                : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {p.shipping_status === "concluido" ? (
                          <span className="font-semibold text-green-700">Expedido</span>
                        ) : p.shipping_status === "parcial" ? (
                          <span className="font-semibold text-amber-700">Parcial</span>
                        ) : (
                          "Aguardando expedição"
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-black tabular-nums">
                        {brl(p.total)}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                          <Link to="/pedidos/$id" params={{ id: p.id }}>
                            Detalhes
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
