import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Boxes,
  Plus,
  AlertTriangle,
  ArrowDownUp,
  Download,
  Search,
  Filter,
  Package,
  Clock,
  CheckCircle2,
  Factory,
  History,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { dateBR, brl } from "@/lib/fmt";
import { useMembership } from "@/lib/session";
import {
  CommercialStore,
  ProductStockPosition,
  StockMovement,
  DEFAULT_CATALOG,
} from "@/lib/commercial-store";

export const Route = createFileRoute("/_authenticated/estoque")({
  head: () => ({
    meta: [
      { title: "Estoque de Produtos Acabados — Ki Delícia Gestão" },
      {
        name: "description",
        content:
          "Saldo físico, reservado, bloqueado e disponível por produto acabado, razão de movimentações e previsão da indústria.",
      },
      { property: "og:title", content: "Estoque de Produtos Acabados — Ki Delícia Gestão" },
      {
        property: "og:description",
        content: "Controle de estoque comercial integrado da Ki Delícia.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: EstoquePage,
});

function EstoquePage() {
  const { data: membership } = useMembership();
  const orgId = membership?.organization?.id || "org-kidelicia";
  const userEmail = membership?.email || "operador@kidelicia.com";
  const canAdjust =
    membership?.roles.includes("administrador") ||
    membership?.roles.includes("gestor") ||
    membership?.roles.includes("producao");

  const [activeTab, setActiveTab] = useState<"posicao" | "movimentos">("posicao");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("todos");

  // Modal de Ajuste de Estoque
  const [openAdjustModal, setOpenAdjustModal] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    productId: DEFAULT_CATALOG[0]!.id,
    type: "positivo" as "positivo" | "negativo",
    qtyCommercial: 1,
    reason: "",
  });

  const [storeVersion, setStoreVersion] = useState(0);
  const refresh = () => setStoreVersion((v) => v + 1);

  const positions = CommercialStore.getStockPositions(orgId);
  const movements = CommercialStore.getMovements(orgId);

  // Filtros
  const filteredPositions = positions.filter((p) => {
    const matchSearch =
      p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = categoryFilter === "todos" || p.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const criticalItems = positions.filter((p) => p.available < p.minStock);
  const outOfStockItems = positions.filter((p) => p.available <= 0);

  function handleSaveAdjustment(e: React.FormEvent) {
    e.preventDefault();
    if (!adjustForm.reason.trim()) {
      toast.error("Informe a justificativa/motivo do ajuste.");
      return;
    }

    const prod = DEFAULT_CATALOG.find((p) => p.id === adjustForm.productId)!;
    const factor = prod.factorToBase;
    const qtyBase =
      adjustForm.type === "positivo"
        ? adjustForm.qtyCommercial * factor
        : -adjustForm.qtyCommercial * factor;

    // Verificar se ajuste negativo deixaria saldo físico negativo
    const currentPos = positions.find((p) => p.productId === adjustForm.productId);
    if (adjustForm.type === "negativo" && currentPos && currentPos.physical + qtyBase < 0) {
      toast.error(
        `Ajuste recusado: saldo físico atual (${currentPos.physical} UN) é insuficiente para baixa de ${Math.abs(qtyBase)} UN.`,
      );
      return;
    }

    CommercialStore.addStockAdjustment(
      orgId,
      adjustForm.productId,
      qtyBase,
      adjustForm.reason,
      userEmail,
    );

    toast.success(
      `Ajuste de estoque gravado: ${qtyBase > 0 ? `+${qtyBase}` : qtyBase} UN em ${prod.description}.`,
    );
    setOpenAdjustModal(false);
    refresh();
  }

  function handleExportCSV() {
    const headers = [
      "SKU",
      "Produto",
      "Categoria",
      "Unidade Base",
      "Embalagem Comercial",
      "Fator",
      "Físico",
      "Reservado",
      "Bloqueado",
      "Disponível",
      "Estoque Mínimo",
      "Previsto Indústria",
    ];
    const rows = filteredPositions.map((p) => [
      p.sku,
      `"${p.description}"`,
      p.category,
      p.baseUnit,
      p.commercialUnit,
      p.factorToBase,
      p.physical,
      p.reserved,
      p.blocked,
      p.available,
      p.minStock,
      p.inTransit,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(";"), ...rows.map((e) => e.join(";"))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `estoque_kidelicia_${new Date().toISOString().slice(0, 10)}.csv`);
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
              ESTOQUE COMERCIAL
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              Produtos acabados Ki Delícia
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#202124] mt-1">
            Estoque de Produtos Acabados
          </h1>
          <p className="text-sm text-muted-foreground">
            Disponibilidade imediata para vendas, reservas de pedidos confirmados e previsão de
            entregas da indústria.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="mr-1.5 size-4" /> Exportar CSV
          </Button>

          {canAdjust && (
            <Button
              size="sm"
              onClick={() => setOpenAdjustModal(true)}
              className="bg-[#B5121B] hover:bg-[#8f0d14] text-white"
            >
              <Plus className="mr-1.5 size-4" /> Ajuste de Estoque
            </Button>
          )}
        </div>
      </div>

      {/* Regra de Ouro do Estoque Comercial */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-900 flex items-start gap-3">
        <Boxes className="size-5 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-sm">
            Fórmula de Controle: Disponível = Físico − Reservado − Bloqueado
          </p>
          <p className="mt-1 text-amber-800">
            O estoque físico reflete os produtos acabados realmente recebidos e conferidos no
            depósito. Ao confirmar um pedido, o sistema <strong>reserva o saldo disponível</strong>;
            o físico só é baixado no momento da <strong>expedição</strong>. A coluna{" "}
            <strong>Previsto da Indústria</strong> representa ordens solicitadas em andamento e{" "}
            <strong>não compõe o saldo disponível para venda imediata</strong>.
          </p>
        </div>
      </div>

      {/* Alertas Operacionais */}
      {(criticalItems.length > 0 || outOfStockItems.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {outOfStockItems.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-900 flex items-center justify-between">
              <div>
                <span className="font-bold text-sm text-red-900 flex items-center gap-1.5">
                  <AlertTriangle className="size-4 text-red-700" /> {outOfStockItems.length}{" "}
                  Produto(s) Sem Estoque
                </span>
                <p className="mt-1 text-red-800">
                  {outOfStockItems.map((p) => p.description).join(", ")}
                </p>
              </div>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="bg-white border-red-300 text-red-800"
              >
                <Link to="/producao">Solicitar Indústria</Link>
              </Button>
            </div>
          )}

          {criticalItems.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 flex items-center justify-between">
              <div>
                <span className="font-bold text-sm text-amber-900 flex items-center gap-1.5">
                  <Clock className="size-4 text-amber-700" /> {criticalItems.length} Produto(s)
                  Abaixo do Mínimo
                </span>
                <p className="mt-1 text-amber-800">
                  Saldos disponíveis inferiores ao limite seguro configurado.
                </p>
              </div>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="bg-white border-amber-300 text-amber-800"
              >
                <Link to="/producao">Ver Ordens</Link>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Navegação entre Abas */}
      <div className="flex border-b text-sm font-semibold">
        <button
          onClick={() => setActiveTab("posicao")}
          className={`px-4 py-2.5 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "posicao"
              ? "border-[#ED1C24] text-[#B5121B]"
              : "border-transparent text-muted-foreground hover:text-[#202124]"
          }`}
        >
          <Boxes className="size-4" /> Posição de Estoque por Produto
        </button>
        <button
          onClick={() => setActiveTab("movimentos")}
          className={`px-4 py-2.5 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "movimentos"
              ? "border-[#ED1C24] text-[#B5121B]"
              : "border-transparent text-muted-foreground hover:text-[#202124]"
          }`}
        >
          <History className="size-4" /> Razão Imutável de Movimentos ({movements.length})
        </button>
      </div>

      {activeTab === "posicao" ? (
        <div className="space-y-4">
          {/* Barra de Filtro e Busca */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3 rounded-lg border">
            <div className="flex items-center gap-3 flex-1 min-w-[240px]">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por descrição ou código SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-md border bg-background px-3 py-2 text-xs font-medium"
              >
                <option value="todos">Todas as Categorias</option>
                <option value="Polvilhos">Polvilhos</option>
                <option value="Broas">Broas</option>
                <option value="Chips">Chips</option>
                <option value="Salgadinhos">Salgadinhos</option>
              </select>
            </div>

            <span className="text-xs text-muted-foreground">
              {filteredPositions.length} item(ns) no catálogo ativo
            </span>
          </div>

          {/* Tabela de Posição de Estoque */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#202124] text-white font-semibold">
                    <th className="px-3 py-3">Código</th>
                    <th className="px-3 py-3">Produto Acabado</th>
                    <th className="px-3 py-3">Embalagem Comercial</th>
                    <th className="px-3 py-3 text-right">Físico</th>
                    <th className="px-3 py-3 text-right text-amber-300">Reservado</th>
                    <th className="px-3 py-3 text-right text-gray-300">Bloqueado</th>
                    <th className="px-3 py-3 text-right font-black text-[#FFEA00]">Disponível</th>
                    <th className="px-3 py-3 text-right">Mínimo</th>
                    <th className="px-3 py-3 text-right text-blue-300">Previsto Indústria</th>
                    <th className="px-3 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {filteredPositions.map((pos) => {
                    const fardosDisponiveis = (pos.available / pos.factorToBase).toFixed(1);
                    const isBelowMin = pos.available < pos.minStock;
                    const isZero = pos.available <= 0;

                    return (
                      <tr key={pos.productId} className="hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-3 font-mono text-[11px] text-muted-foreground">
                          {pos.sku}
                        </td>
                        <td className="px-3 py-3 font-medium text-[#202124]">
                          {pos.description}
                          <span className="block text-[10px] text-muted-foreground">
                            {pos.category} · Unidade Base: {pos.baseUnit}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          {pos.commercialUnit} c/ {pos.factorToBase} {pos.baseUnit}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums font-semibold">
                          {pos.physical} {pos.baseUnit}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-amber-700 font-semibold">
                          {pos.reserved > 0 ? `${pos.reserved} ${pos.baseUnit}` : "0"}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                          {pos.blocked} {pos.baseUnit}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums font-black text-sm text-[#1e7e34]">
                          {pos.available} {pos.baseUnit}
                          <span className="block text-[10px] font-normal text-muted-foreground">
                            (~{fardosDisponiveis} {pos.commercialUnit}s)
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                          {pos.minStock} {pos.baseUnit}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums font-bold text-blue-700">
                          {pos.inTransit > 0 ? (
                            <span>
                              +{pos.inTransit} {pos.baseUnit}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {isZero ? (
                            <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800">
                              Sem Estoque
                            </span>
                          ) : isBelowMin ? (
                            <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                              Abaixo Mínimo
                            </span>
                          ) : (
                            <span className="rounded bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-800">
                              Normal
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
      ) : (
        /* Aba 2: Razão Imutável de Movimentos */
        <div className="rounded-xl border bg-card shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="font-bold text-sm text-[#202124]">
                Extrato Histórico de Movimentações
              </h2>
              <p className="text-xs text-muted-foreground">
                Registro detalhado de todas as entradas da indústria, saídas por vendas e ajustes
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b bg-[#F5F6F8] font-semibold text-[#202124]">
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Tipo de Movimento</th>
                  <th className="px-3 py-2">Produto Acabado</th>
                  <th className="px-3 py-2 text-right">Qtd Base</th>
                  <th className="px-3 py-2">Documento de Origem</th>
                  <th className="px-3 py-2">Lote / Validade</th>
                  <th className="px-3 py-2">Motivo / Justificativa</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                      Nenhuma movimentação registrada.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => (
                    <tr key={m.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2 text-muted-foreground">{dateBR(m.date)}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                            m.movementType === "recebimento_industria" ||
                            m.movementType === "saldo_inicial"
                              ? "bg-green-100 text-green-800"
                              : m.movementType === "saida_expedicao"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {m.movementType.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-medium">{m.productDescription}</td>
                      <td
                        className={`px-3 py-2 text-right tabular-nums font-bold ${
                          m.qtyBase >= 0 ? "text-green-700" : "text-red-700"
                        }`}
                      >
                        {m.qtyBase >= 0 ? `+${m.qtyBase}` : m.qtyBase} UN
                      </td>
                      <td className="px-3 py-2 text-muted-foreground font-mono text-[11px]">
                        {m.sourceDoc || "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {m.lotNumber ? `${m.lotNumber} (${dateBR(m.expiryDate || "")})` : "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{m.reason}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Ajuste de Estoque Manual */}
      <Dialog open={openAdjustModal} onOpenChange={setOpenAdjustModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#202124]">
              Ajuste de Estoque Auditado
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Ajustes geram lançamentos no razão com motivo obrigatório e usuário responsável.
            </p>
          </DialogHeader>

          <form onSubmit={handleSaveAdjustment} className="space-y-3 text-xs">
            <div className="space-y-1">
              <Label>Produto Acabado</Label>
              <select
                value={adjustForm.productId}
                onChange={(e) => setAdjustForm({ ...adjustForm, productId: e.target.value })}
                className="w-full rounded border bg-background px-3 py-2 text-xs"
              >
                {DEFAULT_CATALOG.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.description} ({c.commercialUnit} c/ {c.factorToBase} {c.baseUnit})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tipo de Ajuste</Label>
                <select
                  value={adjustForm.type}
                  onChange={(e) =>
                    setAdjustForm({
                      ...adjustForm,
                      type: e.target.value as "positivo" | "negativo",
                    })
                  }
                  className="w-full rounded border bg-background px-3 py-2 text-xs"
                >
                  <option value="positivo">Entrada (Ajuste Positivo)</option>
                  <option value="negativo">Baixa (Ajuste Negativo)</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label>Quantidade em Fardos/Emb.</Label>
                <Input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={adjustForm.qtyCommercial}
                  onChange={(e) =>
                    setAdjustForm({ ...adjustForm, qtyCommercial: Number(e.target.value) })
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Motivo / Justificativa Obrigatória</Label>
              <Input
                placeholder="Ex.: Inventário rotativo / avaria de embalagem / sobra de expedição"
                value={adjustForm.reason}
                onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                required
              />
            </div>

            <DialogFooter className="border-t pt-3">
              <Button type="button" variant="outline" onClick={() => setOpenAdjustModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-[#B5121B] hover:bg-[#8f0d14] text-white">
                Gravar Movimento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
