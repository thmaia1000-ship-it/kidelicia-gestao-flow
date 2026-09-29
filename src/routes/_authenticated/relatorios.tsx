import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ReceiptText,
  Printer,
  Download,
  Filter,
  Calendar,
  Users,
  Package,
  TrendingUp,
  FileSpreadsheet,
  AlertCircle,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { brl, dateBR } from "@/lib/fmt";
import { useMembership } from "@/lib/session";
import { CommercialStore } from "@/lib/commercial-store";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios Comerciais e Histórico — Ki Delícia Gestão" },
      {
        name: "description",
        content:
          "Relatórios operacionais de vendas, produtos, vendedores, estoque, ordens à indústria e histórico 2025.",
      },
      { property: "og:title", content: "Relatórios Comerciais — Ki Delícia Gestão" },
      { property: "og:description", content: "Relatórios e histórico das planilhas Ki Delícia." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: RelatoriosPage,
});

// Dados do histórico real de 2025 das planilhas
const HISTORICO_2025_MENSAL = [
  { mes: "Janeiro", total: 48920.5, detalhamentoVendedor: true },
  { mes: "Fevereiro", total: 43110.2, detalhamentoVendedor: false },
  { mes: "Março", total: 51240.8, detalhamentoVendedor: false },
  { mes: "Abril", total: 47800.0, detalhamentoVendedor: false },
  { mes: "Maio", total: 49300.4, detalhamentoVendedor: false },
  { mes: "Junho", total: 52100.0, detalhamentoVendedor: false },
  { mes: "Julho", total: 46750.3, detalhamentoVendedor: false },
  { mes: "Agosto", total: 50400.1, detalhamentoVendedor: false },
  { mes: "Setembro", total: 48200.0, detalhamentoVendedor: false },
  { mes: "Outubro", total: 49850.0, detalhamentoVendedor: false },
  { mes: "Novembro", total: 44200.0, detalhamentoVendedor: false },
  { mes: "Dezembro", total: 55834.0, detalhamentoVendedor: true },
];

const HISTORICO_VENDEDORES_AMOSTRA = [
  {
    vendedor: "CARVALHO (DEZEMBRO)",
    canal: "Rota Metropolitana",
    produto: "Polvilho Azedo Ki Delícia 35g",
    unidade: "FARDO",
    qtd: 280,
    valor: 23520.0,
  },
  {
    vendedor: "CARVALHO (DEZEMBRO)",
    canal: "Rota Metropolitana",
    produto: "Broa de Milho 70g",
    unidade: "FARDO",
    qtd: 140,
    valor: 14700.0,
  },
  {
    vendedor: "CRAVALHO (JANEIRO - A CONFERIR)",
    canal: "Rota Interior",
    produto: "Polvilho Doce Ki Delícia 35g",
    unidade: "FARDO",
    qtd: 210,
    valor: 17640.0,
  },
  {
    vendedor: "FÁBRICA (CANAL INTERNO)",
    canal: "Venda Direta Fábrica",
    produto: "Banana Chips Salgada 40g",
    unidade: "FARDO",
    qtd: 120,
    valor: 9216.0,
  },
];

function RelatoriosPage() {
  const { data: membership } = useMembership();
  const orgId = membership?.organization?.id;

  const [activeTab, setActiveTab] = useState<"vendas" | "estoque" | "ordens" | "historico">(
    "vendas",
  );

  const queryOrders = useQuery({
    queryKey: ["relatorios-orders", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_orders")
        .select(
          "id, number, order_date, status, total, payment_terms, customers(trade_name, legal_name)",
        )
        .eq("organization_id", orgId!)
        .order("order_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const orders = queryOrders.data || [];
  const positions = orgId ? CommercialStore.getStockPositions(orgId) : [];
  const industryOrders = orgId ? CommercialStore.getOrders(orgId) : [];

  function handleExportCSV() {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let filename = "relatorio.csv";

    if (activeTab === "vendas") {
      filename = "relatorio_vendas_kidelicia.csv";
      headers = ["Pedido", "Data", "Cliente", "Situação", "Condição", "Total"];
      rows = orders.map((o) => {
        const c = o.customers as unknown as {
          trade_name: string | null;
          legal_name: string;
        } | null;
        return [
          `#${o.number}`,
          dateBR(o.order_date),
          `"${c?.trade_name || c?.legal_name || "—"}"`,
          o.status,
          `"${o.payment_terms || "—"}"`,
          o.total,
        ];
      });
    } else if (activeTab === "estoque") {
      filename = "relatorio_estoque_kidelicia.csv";
      headers = [
        "SKU",
        "Produto",
        "Físico",
        "Reservado",
        "Bloqueado",
        "Disponível",
        "Mínimo",
        "Previsto Indústria",
      ];
      rows = positions.map((p) => [
        p.sku,
        `"${p.description}"`,
        p.physical,
        p.reserved,
        p.blocked,
        p.available,
        p.minStock,
        p.inTransit,
      ]);
    } else if (activeTab === "ordens") {
      filename = "relatorio_ordens_industria.csv";
      headers = [
        "Ordem",
        "Emissão",
        "Previsão",
        "Status",
        "Prioridade",
        "Total Base",
        "Total Atendido",
      ];
      rows = industryOrders.map((o) => {
        const totalBase = o.items.reduce((s, i) => s + i.qtyBase, 0);
        const totalAccepted = o.items.reduce((s, i) => s + i.qtyAcceptedBase, 0);
        return [
          o.orderNumber,
          dateBR(o.emissionDate),
          dateBR(o.solicitedDate),
          o.industryStatus,
          o.priority,
          totalBase,
          totalAccepted,
        ];
      });
    } else {
      filename = "historico_planilhas_2025.csv";
      headers = ["Mês", "Total Informado (R$)", "Detalhamento de Vendedores"];
      rows = HISTORICO_2025_MENSAL.map((h) => [
        h.mes,
        h.total,
        h.detalhamentoVendedor ? "Disponível na pasta" : "Não disponível",
      ]);
    }

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(";"), ...rows.map((e) => e.join(";"))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-6">
      {/* Header com Identidade Ki Delícia */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-[#ED1C24] px-2 py-0.5 text-xs font-black text-white">
              RELATÓRIOS & AUDITORIA
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              Inteligência e transparência operacional
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#202124] mt-1">
            Relatórios Comerciais e Histórico
          </h1>
          <p className="text-sm text-muted-foreground">
            Acompanhamento de vendas, posição de estoque, ordens à indústria e histórico 2025 das
            planilhas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-1.5 size-4" /> Imprimir
          </Button>
          <Button
            size="sm"
            onClick={handleExportCSV}
            className="bg-[#202124] text-white hover:bg-black"
          >
            <Download className="mr-1.5 size-4" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap border-b text-xs sm:text-sm font-semibold gap-1">
        <button
          onClick={() => setActiveTab("vendas")}
          className={`px-4 py-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === "vendas"
              ? "border-[#ED1C24] text-[#B5121B]"
              : "border-transparent text-muted-foreground hover:text-[#202124]"
          }`}
        >
          <TrendingUp className="size-4" /> Vendas e Pedidos
        </button>
        <button
          onClick={() => setActiveTab("estoque")}
          className={`px-4 py-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === "estoque"
              ? "border-[#ED1C24] text-[#B5121B]"
              : "border-transparent text-muted-foreground hover:text-[#202124]"
          }`}
        >
          <Package className="size-4" /> Posição de Estoque
        </button>
        <button
          onClick={() => setActiveTab("ordens")}
          className={`px-4 py-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === "ordens"
              ? "border-[#ED1C24] text-[#B5121B]"
              : "border-transparent text-muted-foreground hover:text-[#202124]"
          }`}
        >
          <ReceiptText className="size-4" /> Ordens à Indústria
        </button>
        <button
          onClick={() => setActiveTab("historico")}
          className={`px-4 py-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === "historico"
              ? "border-[#ED1C24] text-[#B5121B]"
              : "border-transparent text-muted-foreground hover:text-[#202124]"
          }`}
        >
          <FileSpreadsheet className="size-4 text-[#ED1C24]" /> Histórico das Planilhas (2025)
        </button>
      </div>

      {/* CONTEÚDO DAS ABAS */}
      {activeTab === "vendas" && (
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="font-bold text-base text-[#202124]">
                Relatório Operacional de Pedidos
              </h2>
              <p className="text-xs text-muted-foreground">
                Listagem de pedidos registrados no sistema com clientes e totais
              </p>
            </div>
            <span className="text-xs font-bold text-[#B5121B]">{orders.length} pedidos</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b bg-[#F5F6F8] font-semibold text-[#202124]">
                  <th className="p-2.5">Pedido Nº</th>
                  <th className="p-2.5">Data</th>
                  <th className="p-2.5">Cliente</th>
                  <th className="p-2.5">Situação</th>
                  <th className="p-2.5">Condição Pagto</th>
                  <th className="p-2.5 text-right">Total Comercial</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      Nenhum pedido de venda registrado ainda.
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => {
                    const c = o.customers as unknown as {
                      trade_name: string | null;
                      legal_name: string;
                    } | null;
                    return (
                      <tr key={o.id} className="hover:bg-muted/20">
                        <td className="p-2.5 font-bold text-[#B5121B]">#{o.number}</td>
                        <td className="p-2.5 text-muted-foreground">{dateBR(o.order_date)}</td>
                        <td className="p-2.5 font-medium">
                          {c?.trade_name || c?.legal_name || "—"}
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                              o.status === "confirmado"
                                ? "bg-green-100 text-green-800"
                                : o.status === "cancelado"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {o.status}
                          </span>
                        </td>
                        <td className="p-2.5 text-muted-foreground">
                          {o.payment_terms || "À vista"}
                        </td>
                        <td className="p-2.5 text-right font-black tabular-nums">{brl(o.total)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "estoque" && (
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="font-bold text-base text-[#202124]">
                Relatório da Posição de Estoque
              </h2>
              <p className="text-xs text-muted-foreground">
                Físico, reservado, bloqueado, disponível e previsto da indústria
              </p>
            </div>
            <span className="text-xs font-bold text-green-700">
              {positions.length} produtos monitorados
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b bg-[#F5F6F8] font-semibold text-[#202124]">
                  <th className="p-2.5">Código</th>
                  <th className="p-2.5">Produto Acabado</th>
                  <th className="p-2.5">Apresentação</th>
                  <th className="p-2.5 text-right">Físico</th>
                  <th className="p-2.5 text-right text-amber-700">Reservado</th>
                  <th className="p-2.5 text-right font-bold text-[#1e7e34]">Disponível</th>
                  <th className="p-2.5 text-right">Mínimo</th>
                  <th className="p-2.5 text-right text-blue-700">Previsto Indústria</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {positions.map((p) => (
                  <tr key={p.productId} className="hover:bg-muted/20">
                    <td className="p-2.5 font-mono text-muted-foreground">{p.sku}</td>
                    <td className="p-2.5 font-medium text-[#202124]">{p.description}</td>
                    <td className="p-2.5 text-muted-foreground">
                      {p.commercialUnit} c/ {p.factorToBase} {p.baseUnit}
                    </td>
                    <td className="p-2.5 text-right tabular-nums">
                      {p.physical} {p.baseUnit}
                    </td>
                    <td className="p-2.5 text-right tabular-nums text-amber-700 font-semibold">
                      {p.reserved} {p.baseUnit}
                    </td>
                    <td className="p-2.5 text-right tabular-nums font-bold text-[#1e7e34]">
                      {p.available} {p.baseUnit}
                    </td>
                    <td className="p-2.5 text-right tabular-nums text-muted-foreground">
                      {p.minStock} {p.baseUnit}
                    </td>
                    <td className="p-2.5 text-right tabular-nums font-bold text-blue-700">
                      {p.inTransit > 0 ? `+${p.inTransit} ${p.baseUnit}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "ordens" && (
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="font-bold text-base text-[#202124]">
                Relatório de Ordens à Indústria
              </h2>
              <p className="text-xs text-muted-foreground">
                Solicitações de produtos acabados, andamento na fábrica e recebimentos
              </p>
            </div>
            <span className="text-xs font-bold text-blue-700">{industryOrders.length} ordens</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b bg-[#F5F6F8] font-semibold text-[#202124]">
                  <th className="p-2.5">Ordem Nº</th>
                  <th className="p-2.5">Emissão</th>
                  <th className="p-2.5">Previsão Fábrica</th>
                  <th className="p-2.5">Status Indústria</th>
                  <th className="p-2.5">Prioridade</th>
                  <th className="p-2.5 text-right">Total Solicitado</th>
                  <th className="p-2.5 text-right text-green-700">Total Recebido</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {industryOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground">
                      Nenhuma ordem à indústria emitida ainda.
                    </td>
                  </tr>
                ) : (
                  industryOrders.map((o) => {
                    const totalBase = o.items.reduce((s, i) => s + i.qtyBase, 0);
                    const totalAccepted = o.items.reduce((s, i) => s + i.qtyAcceptedBase, 0);
                    return (
                      <tr key={o.id} className="hover:bg-muted/20">
                        <td className="p-2.5 font-bold text-[#202124]">{o.orderNumber}</td>
                        <td className="p-2.5 text-muted-foreground">{dateBR(o.emissionDate)}</td>
                        <td className="p-2.5 text-muted-foreground">
                          {o.confirmedDate ? dateBR(o.confirmedDate) : dateBR(o.solicitedDate)}
                        </td>
                        <td className="p-2.5">
                          <span className="rounded bg-blue-100 text-blue-800 px-1.5 py-0.5 text-[10px] font-bold uppercase">
                            {o.industryStatus.replace("_", " ")}
                          </span>
                        </td>
                        <td className="p-2.5 uppercase font-bold text-muted-foreground">
                          {o.priority}
                        </td>
                        <td className="p-2.5 text-right tabular-nums">{totalBase} UN</td>
                        <td className="p-2.5 text-right tabular-nums font-bold text-green-700">
                          {totalAccepted} UN
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "historico" && (
        <div className="space-y-6">
          {/* Regras do Histórico 2025 */}
          <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 text-xs text-[#202124] flex items-start gap-3">
            <AlertCircle className="size-5 text-[#B5121B] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-[#B5121B]">
                Regras Obrigatórias do Histórico 2025 (Planilhas Analisadas)
              </p>
              <ul className="mt-1.5 list-disc list-inside space-y-1 text-muted-foreground">
                <li>
                  O valor informado de <strong>R$ 587.706,30</strong> é o total original declarado,
                  não um valor auditado.
                </li>
                <li>
                  O histórico de 2025 é agregado e{" "}
                  <strong>não gera caixa, títulos a receber nem saldo de estoque</strong>.
                </li>
                <li>
                  Somente os meses de <strong>Janeiro e Dezembro</strong> possuem detalhamento por
                  vendedor na pasta analisada. Meses sem detalhamento aparecem expressamente como{" "}
                  <strong>“não disponível”</strong>, nunca zero.
                </li>
                <li>
                  O consolidado anual{" "}
                  <strong>nunca é somado ao detalhamento dos mesmos meses</strong> para evitar
                  duplicidade.
                </li>
              </ul>
            </div>
          </div>

          {/* Consolidado Mensal 2025 */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="font-bold text-base text-[#202124]">
                  Consolidado Mensal 2025 (00 VENDA GERAL ANO 2025.xlsx)
                </h2>
                <p className="text-xs text-muted-foreground">
                  Valores declarados na origem · Total informado: <strong>R$ 587.706,30</strong>
                </p>
              </div>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b bg-[#F5F6F8] font-semibold text-[#202124]">
                    <th className="p-2.5">Mês de Referência</th>
                    <th className="p-2.5 text-right">Valor Informado na Origem</th>
                    <th className="p-2.5 text-center">Detalhamento por Vendedor</th>
                    <th className="p-2.5">Situação da Cobertura</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {HISTORICO_2025_MENSAL.map((h, idx) => (
                    <tr key={idx} className="hover:bg-muted/20">
                      <td className="p-2.5 font-bold text-[#202124]">{h.mes} / 2025</td>
                      <td className="p-2.5 text-right font-mono font-bold tabular-nums text-[#202124]">
                        {brl(h.total)}
                      </td>
                      <td className="p-2.5 text-center">
                        {h.detalhamentoVendedor ? (
                          <span className="rounded bg-green-100 text-green-800 px-2 py-0.5 text-[10px] font-bold">
                            Disponível na pasta
                          </span>
                        ) : (
                          <span className="rounded bg-gray-100 text-gray-600 px-2 py-0.5 text-[10px] font-bold">
                            Não disponível
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-muted-foreground text-[11px]">
                        {h.detalhamentoVendedor
                          ? "Arquivo individual por vendedor OK"
                          : "Apenas valor consolidado no anual (não inventar vendedores)"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 bg-[#F5F6F8] font-black text-xs">
                  <tr>
                    <td className="p-2.5">Total Informado no Ano de 2025:</td>
                    <td className="p-2.5 text-right font-mono text-sm text-[#ED1C24]">
                      R$ 587.706,30
                    </td>
                    <td colSpan={2} className="p-2.5 text-muted-foreground text-[11px] font-normal">
                      * Sujeito à conferência final de células divergentes (ex.: anotação "19*")
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Amostra do Detalhamento por Vendedor */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="font-bold text-base text-[#202124]">
                  Amostra de Vendas por Vendedor (Janeiro e Dezembro 2025)
                </h2>
                <p className="text-xs text-muted-foreground">
                  Comparação de quantidades em fardos e valores por canal
                </p>
              </div>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b bg-[#F5F6F8] font-semibold text-[#202124]">
                    <th className="p-2.5">Vendedor / Canal</th>
                    <th className="p-2.5">Rota / Canal</th>
                    <th className="p-2.5">Produto Declarado</th>
                    <th className="p-2.5 text-right">Qtd</th>
                    <th className="p-2.5 text-right">Total Comercial</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {HISTORICO_VENDEDORES_AMOSTRA.map((v, idx) => (
                    <tr key={idx} className="hover:bg-muted/20">
                      <td className="p-2.5 font-bold text-[#202124]">{v.vendedor}</td>
                      <td className="p-2.5 text-muted-foreground">{v.canal}</td>
                      <td className="p-2.5 font-medium">{v.produto}</td>
                      <td className="p-2.5 text-right tabular-nums">
                        {v.qtd} {v.unidade}
                      </td>
                      <td className="p-2.5 text-right font-black tabular-nums text-[#202124]">
                        {brl(v.valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
