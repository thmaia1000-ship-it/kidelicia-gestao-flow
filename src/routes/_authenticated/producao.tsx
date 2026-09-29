import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Factory,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Printer,
  PackageCheck,
  ChevronRight,
  Filter,
  X,
  Truck,
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
  IndustryOrder,
  IndustryOrderStatus,
  DEFAULT_CATALOG,
} from "@/lib/commercial-store";

export const Route = createFileRoute("/_authenticated/producao")({
  head: () => ({
    meta: [
      { title: "Ordens à Indústria — Ki Delícia Gestão" },
      {
        name: "description",
        content:
          "Ordem de produção — solicitação comercial de produtos acabados à indústria fornecedora e recebimento conferido.",
      },
      { property: "og:title", content: "Ordens à Indústria — Ki Delícia Gestão" },
      {
        property: "og:description",
        content: "Solicitações de produtos acabados à indústria parceira.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: OrdensIndustriaPage,
});

function OrdensIndustriaPage() {
  const { data: membership } = useMembership();
  const orgId = membership?.organization?.id || "org-kidelicia";
  const userEmail = membership?.email || "operador@kidelicia.com";
  const canSeeCosts = membership?.roles.includes("administrador");

  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [selectedOrder, setSelectedOrder] = useState<IndustryOrder | null>(null);

  // Modais
  const [openNewOrderModal, setOpenNewOrderModal] = useState(false);
  const [openReceiptModal, setOpenReceiptModal] = useState(false);
  const [openStatusModal, setOpenStatusModal] = useState(false);
  const [openPrintModal, setOpenPrintModal] = useState(false);

  // Forçar re-render após mutações no store
  const [storeVersion, setStoreVersion] = useState(0);
  const refresh = () => setStoreVersion((v) => v + 1);

  const orders = CommercialStore.getOrders(orgId);
  const receipts = CommercialStore.getReceipts(orgId);

  // Form State: Nova Ordem
  const [newOrderForm, setNewOrderForm] = useState({
    industryName: "Indústria Ki Delícia Ltda",
    solicitedDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]!,
    priority: "normal" as "baixa" | "normal" | "alta" | "urgente",
    origin: "reposicao" as "reposicao" | "pedidos",
    notes: "",
    items: [
      {
        productId: DEFAULT_CATALOG[0]!.id,
        commercialUnit: DEFAULT_CATALOG[0]!.commercialUnit,
        factorToBase: DEFAULT_CATALOG[0]!.factorToBase,
        qtyCommercial: 5,
        unitCost: 1.25,
      },
    ],
  });

  // Form State: Recebimento Conferido
  const [receiptForm, setReceiptForm] = useState<{
    receiptDate: string;
    responsible: string;
    documentRef: string;
    notes: string;
    items: {
      productId: string;
      productDescription: string;
      commercialUnit: string;
      factorToBase: number;
      qtyRemainingBase: number;
      qtyDeliveredCommercial: number;
      qtyAcceptedCommercial: number;
      qtyRejectedCommercial: number;
      rejectionReason: string;
      lotNumber: string;
      expiryDate: string;
    }[];
  }>({
    receiptDate: new Date().toISOString().split("T")[0]!,
    responsible: userEmail,
    documentRef: "",
    notes: "",
    items: [],
  });

  // Form State: Atualização de Status da Fábrica
  const [statusUpdateForm, setStatusUpdateForm] = useState<{
    newStatus: IndustryOrderStatus;
    confirmedDate: string;
  }>({
    newStatus: "em_producao",
    confirmedDate: "",
  });

  // Handlers
  function handleOpenReceipt(order: IndustryOrder) {
    setSelectedOrder(order);
    const initialItems = order.items.map((i) => {
      const remainingBase = Math.max(0, i.qtyBase - i.qtyAcceptedBase);
      const remainingCommercial = Math.ceil(remainingBase / i.factorToBase);
      return {
        productId: i.productId,
        productDescription: i.productDescription,
        commercialUnit: i.commercialUnit,
        factorToBase: i.factorToBase,
        qtyRemainingBase: remainingBase,
        qtyDeliveredCommercial: remainingCommercial,
        qtyAcceptedCommercial: remainingCommercial,
        qtyRejectedCommercial: 0,
        rejectionReason: "",
        lotNumber: `LOTE-${new Date().toISOString().slice(2, 7).replace("-", "")}`,
        expiryDate: new Date(Date.now() + 180 * 86400000).toISOString().split("T")[0]!,
      };
    });

    setReceiptForm({
      receiptDate: new Date().toISOString().split("T")[0]!,
      responsible: userEmail,
      documentRef: `Romaneio Fábrica nº ${Math.floor(1000 + Math.random() * 9000)}`,
      notes: "Recebimento e conferência física realizados na doca do comércio Ki Delícia.",
      items: initialItems,
    });
    setOpenReceiptModal(true);
  }

  function handleOpenStatusUpdate(order: IndustryOrder) {
    setSelectedOrder(order);
    setStatusUpdateForm({
      newStatus: order.industryStatus,
      confirmedDate: order.confirmedDate || order.solicitedDate,
    });
    setOpenStatusModal(true);
  }

  function handleSaveStatus() {
    if (!selectedOrder) return;
    try {
      CommercialStore.updateIndustryStatus(
        orgId,
        selectedOrder.id,
        statusUpdateForm.newStatus,
        statusUpdateForm.confirmedDate,
      );
      toast.success(
        `Status da ordem ${selectedOrder.orderNumber} atualizado para "${statusUpdateForm.newStatus.replace("_", " ")}".`,
      );
      setOpenStatusModal(false);
      refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar status");
    }
  }

  function handleSubmitReceipt(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOrder) return;

    if (!receiptForm.documentRef.trim()) {
      toast.error("Informe a referência documental (Romaneio / NF de remessa).");
      return;
    }

    try {
      const rec = CommercialStore.recordReceipt(orgId, {
        orderId: selectedOrder.id,
        receiptDate: receiptForm.receiptDate,
        responsible: receiptForm.responsible,
        documentRef: receiptForm.documentRef,
        notes: receiptForm.notes,
        items: receiptForm.items.map((i) => ({
          productId: i.productId,
          qtyDeliveredCommercial: Number(i.qtyDeliveredCommercial),
          qtyAcceptedCommercial: Number(i.qtyAcceptedCommercial),
          qtyRejectedCommercial: Number(i.qtyRejectedCommercial),
          rejectionReason: i.rejectionReason,
          lotNumber: i.lotNumber,
          expiryDate: i.expiryDate,
        })),
      });

      const totalAcceptedBase = rec.items.reduce((sum, item) => sum + item.qtyAcceptedBase, 0);
      toast.success(
        `Recebimento conferido com sucesso! Entrada de ${totalAcceptedBase} UN no estoque físico e disponível.`,
      );
      setOpenReceiptModal(false);
      refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao conferir recebimento");
    }
  }

  function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault();
    try {
      const ord = CommercialStore.createIndustryOrder(orgId, {
        industryName: newOrderForm.industryName,
        solicitedDate: newOrderForm.solicitedDate,
        priority: newOrderForm.priority,
        origin: newOrderForm.origin,
        notes: newOrderForm.notes,
        items: newOrderForm.items.map((i) => ({
          productId: i.productId,
          commercialUnit: i.commercialUnit,
          factorToBase: i.factorToBase,
          qtyCommercial: Number(i.qtyCommercial),
          unitCost: i.unitCost,
        })),
      });

      toast.success(`Ordem à indústria ${ord.orderNumber} emitida com sucesso!`);
      setOpenNewOrderModal(false);
      refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar ordem");
    }
  }

  const filteredOrders = orders.filter((o) => {
    if (filterStatus === "todos") return true;
    if (filterStatus === "abertas")
      return o.industryStatus !== "encerrada" && o.industryStatus !== "cancelada";
    return o.industryStatus === filterStatus;
  });

  return (
    <div className="space-y-6">
      {/* Page Header com Identidade Ki Delícia */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-[#ED1C24] px-2 py-0.5 text-xs font-black text-white">
              INDÚSTRIA PARCEIRA
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              Ordem de produção — solicitação de produtos acabados
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#202124] mt-1">
            Ordens à Indústria
          </h1>
          <p className="text-sm text-muted-foreground">
            Solicitação comercial de produtos acabados à fábrica fornecedora, acompanhamento de
            produção e recebimento conferido no estoque.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setOpenNewOrderModal(true)}
            className="bg-[#B5121B] hover:bg-[#8f0d14] text-white"
          >
            <Plus className="mr-1.5 size-4" /> Nova Solicitação à Indústria
          </Button>
        </div>
      </div>

      {/* Regra de Negócio Explícita */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-xs text-blue-900 flex items-start gap-3">
        <Factory className="size-5 text-blue-700 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-sm">
            Fluxo de Atendimento Comercial com a Indústria Fornecedora
          </p>
          <p className="mt-1 text-blue-800">
            A Ki Delícia é uma empresa comercial que adquire produtos acabados de sua indústria
            parceira.
            <strong>
              {" "}
              Ordens ainda não recebidas ou em status "pronta" NÃO aumentam o estoque físico nem o
              disponível
            </strong>
            . A entrada no estoque ocorre{" "}
            <strong>exclusivamente através do Recebimento Conferido</strong> com as quantidades
            aceitas. Itens rejeitados registram justificativa e permanecem como necessidade de
            reposição pendente.
          </p>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3 rounded-lg border">
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground">Filtrar por Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-md border bg-background px-2.5 py-1 text-xs font-medium"
          >
            <option value="todos">Todas as Ordens</option>
            <option value="abertas">Em Andamento (Abertas)</option>
            <option value="enviada">Enviadas</option>
            <option value="confirmada">Confirmadas</option>
            <option value="em_producao">Em Produção na Indústria</option>
            <option value="pronta">Prontas para Coleta</option>
            <option value="encerrada">Encerradas / Recebidas</option>
          </select>
        </div>

        <div className="text-xs text-muted-foreground">
          Exibindo <strong>{filteredOrders.length}</strong> de <strong>{orders.length}</strong>{" "}
          ordem(ns)
        </div>
      </div>

      {/* Lista de Ordens à Indústria */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
            Nenhuma ordem à indústria encontrada com o filtro selecionado.
          </div>
        ) : (
          filteredOrders.map((ord) => {
            const totalBase = ord.items.reduce((s, i) => s + i.qtyBase, 0);
            const totalAccepted = ord.items.reduce((s, i) => s + i.qtyAcceptedBase, 0);
            const totalRejected = ord.items.reduce((s, i) => s + i.qtyRejectedBase, 0);
            const totalRemaining = Math.max(0, totalBase - totalAccepted);
            const progress = totalBase > 0 ? Math.round((totalAccepted / totalBase) * 100) : 0;

            const isCompleted = ord.industryStatus === "encerrada" || totalRemaining === 0;

            return (
              <div
                key={ord.id}
                className="rounded-xl border bg-card p-5 shadow-sm transition-all hover:border-[#ED1C24]/50"
              >
                {/* Cabeçalho da Ordem */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black text-lg text-[#202124]">{ord.orderNumber}</span>
                    <span className="text-xs text-muted-foreground">· {ord.industryName}</span>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${
                        ord.industryStatus === "encerrada"
                          ? "bg-green-100 text-green-800"
                          : ord.industryStatus === "pronta"
                            ? "bg-amber-100 text-amber-800"
                            : ord.industryStatus === "em_producao"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {ord.industryStatus.replace("_", " ")}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                        ord.priority === "urgente" || ord.priority === "alta"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      Prioridade: {ord.priority}
                    </span>
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      Origem: {ord.origin === "pedidos" ? "Atendimento a Pedidos" : "Reposição"}
                    </span>
                  </div>

                  {/* Ações da Ordem */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedOrder(ord);
                        setOpenPrintModal(true);
                      }}
                      className="h-8 text-xs"
                    >
                      <Printer className="mr-1 size-3.5" /> Espelho / PDF
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenStatusUpdate(ord)}
                      className="h-8 text-xs border-[#202124]"
                    >
                      <Clock className="mr-1 size-3.5" /> Andamento Fábrica
                    </Button>

                    {!isCompleted && (
                      <Button
                        size="sm"
                        onClick={() => handleOpenReceipt(ord)}
                        className="h-8 text-xs bg-[#B5121B] hover:bg-[#8f0d14] text-white"
                      >
                        <PackageCheck className="mr-1 size-3.5" /> Conferir Recebimento
                      </Button>
                    )}
                  </div>
                </div>

                {/* Datas e Metas */}
                <div className="mt-3 grid gap-2 text-xs sm:grid-cols-4 bg-[#F5F6F8] p-2.5 rounded-lg">
                  <div>
                    <span className="text-muted-foreground">Emissão:</span>{" "}
                    <strong>{dateBR(ord.emissionDate)}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Data Solicitada:</span>{" "}
                    <strong>{dateBR(ord.solicitedDate)}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Previsão Fábrica:</span>{" "}
                    <strong>
                      {ord.confirmedDate ? dateBR(ord.confirmedDate) : "Aguardando confirmação"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Atendimento:</span>{" "}
                    <strong className={isCompleted ? "text-green-700" : "text-blue-700"}>
                      {totalAccepted} / {totalBase} UN ({progress}%)
                    </strong>
                  </div>
                </div>

                {/* Tabela de Itens da Ordem */}
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b text-muted-foreground font-semibold">
                        <th className="py-2">Produto Acabado</th>
                        <th className="py-2">Apresentação</th>
                        <th className="py-2 text-right">Solicitado</th>
                        <th className="py-2 text-right">Base</th>
                        <th className="py-2 text-right text-green-700">Aceito (Estoque)</th>
                        <th className="py-2 text-right text-red-700">Rejeitado</th>
                        <th className="py-2 text-right font-bold text-blue-700">Saldo Pendente</th>
                        {canSeeCosts && <th className="py-2 text-right">Custo Unit.</th>}
                        <th className="py-2 text-center">Status Item</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {ord.items.map((item) => {
                        const itemRemaining = Math.max(0, item.qtyBase - item.qtyAcceptedBase);
                        return (
                          <tr key={item.id} className="hover:bg-muted/20">
                            <td className="py-2 font-medium text-[#202124]">
                              {item.productDescription}
                              <span className="block text-[10px] text-muted-foreground font-mono">
                                {item.productSku}
                              </span>
                            </td>
                            <td className="py-2 text-muted-foreground">
                              {item.commercialUnit} c/ {item.factorToBase} UN
                            </td>
                            <td className="py-2 text-right tabular-nums font-semibold">
                              {item.qtyCommercial} {item.commercialUnit}
                            </td>
                            <td className="py-2 text-right tabular-nums text-muted-foreground">
                              {item.qtyBase} UN
                            </td>
                            <td className="py-2 text-right tabular-nums font-bold text-green-700">
                              {item.qtyAcceptedBase} UN
                            </td>
                            <td className="py-2 text-right tabular-nums text-red-700">
                              {item.qtyRejectedBase > 0 ? `${item.qtyRejectedBase} UN` : "—"}
                            </td>
                            <td className="py-2 text-right tabular-nums font-bold text-blue-700">
                              {itemRemaining} UN
                            </td>
                            {canSeeCosts && (
                              <td className="py-2 text-right tabular-nums text-muted-foreground">
                                {item.unitCost ? brl(item.unitCost) : "—"}
                              </td>
                            )}
                            <td className="py-2 text-center">
                              {item.fulfillmentStatus === "recebido_integral" ? (
                                <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-800">
                                  Atendido
                                </span>
                              ) : item.fulfillmentStatus === "parcial" ? (
                                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-800">
                                  Parcial
                                </span>
                              ) : (
                                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-700">
                                  Pendente
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {ord.notes && (
                  <p className="mt-2 text-[11px] text-muted-foreground italic border-t pt-2">
                    Obs: {ord.notes}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Histórico de Recebimentos Conferidos */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <PackageCheck className="size-5 text-green-700" />
            <div>
              <h2 className="font-bold text-base text-[#202124]">
                Histórico de Recebimentos da Indústria
              </h2>
              <p className="text-xs text-muted-foreground">
                Conferências físicas realizadas que geraram entrada no estoque de produtos acabados
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-green-800 bg-green-100 px-2 py-0.5 rounded">
            {receipts.length} recebimento(s) auditado(s)
          </span>
        </div>

        <div className="mt-4 divide-y">
          {receipts.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              Nenhum recebimento registrado ainda nesta organização.
            </div>
          ) : (
            receipts.map((rec) => (
              <div key={rec.id} className="py-3 flex flex-col gap-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#202124]">
                      Recebimento da {rec.orderNumber}
                    </span>
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-mono text-gray-700">
                      Doc: {rec.documentRef}
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    Data: <strong>{dateBR(rec.receiptDate)}</strong> · Responsável:{" "}
                    <strong>{rec.responsible}</strong>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="text-muted-foreground border-b">
                        <th className="py-1">Produto</th>
                        <th className="py-1 text-right">Entregue</th>
                        <th className="py-1 text-right text-green-700 font-bold">
                          Aceito (Estoque)
                        </th>
                        <th className="py-1 text-right text-red-700">Rejeitado</th>
                        <th className="py-1">Lote / Validade</th>
                        <th className="py-1">Motivo Rejeição</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {rec.items.map((i, idx) => (
                        <tr key={idx}>
                          <td className="py-1 font-medium">{i.productDescription}</td>
                          <td className="py-1 text-right">
                            {i.qtyDeliveredCommercial} {i.commercialUnit}
                          </td>
                          <td className="py-1 text-right font-bold text-green-700">
                            +{i.qtyAcceptedBase} UN
                          </td>
                          <td className="py-1 text-right text-red-700">
                            {i.qtyRejectedBase > 0 ? `${i.qtyRejectedBase} UN` : "0"}
                          </td>
                          <td className="py-1 text-muted-foreground">
                            {i.lotNumber ? `${i.lotNumber} (${dateBR(i.expiryDate || "")})` : "—"}
                          </td>
                          <td className="py-1 text-red-600 italic">{i.rejectionReason || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL 1: Nova Ordem à Indústria */}
      <Dialog open={openNewOrderModal} onOpenChange={setOpenNewOrderModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#202124]">
              Nova Solicitação à Indústria (Ordem de Produção)
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Emitir solicitação formal de produtos acabados para a fábrica parceira.
            </p>
          </DialogHeader>

          <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="ind-name">Indústria Fornecedora</Label>
                <Input
                  id="ind-name"
                  value={newOrderForm.industryName}
                  onChange={(e) =>
                    setNewOrderForm({ ...newOrderForm, industryName: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="solic-date">Data Desejada de Entrega</Label>
                <Input
                  id="solic-date"
                  type="date"
                  value={newOrderForm.solicitedDate}
                  onChange={(e) =>
                    setNewOrderForm({ ...newOrderForm, solicitedDate: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="prio">Prioridade</Label>
                <select
                  id="prio"
                  value={newOrderForm.priority}
                  onChange={(e) =>
                    setNewOrderForm({
                      ...newOrderForm,
                      priority: e.target.value as "baixa" | "normal" | "alta" | "urgente",
                    })
                  }
                  className="w-full rounded-md border bg-background px-3 py-2 text-xs"
                >
                  <option value="baixa">Baixa</option>
                  <option value="normal">Normal</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="orig">Finalidade / Origem</Label>
                <select
                  id="orig"
                  value={newOrderForm.origin}
                  onChange={(e) =>
                    setNewOrderForm({
                      ...newOrderForm,
                      origin: e.target.value as "reposicao" | "pedidos",
                    })
                  }
                  className="w-full rounded-md border bg-background px-3 py-2 text-xs"
                >
                  <option value="reposicao">Reposição de Estoque Planejada</option>
                  <option value="pedidos">Atendimento a Pedidos com Falta</option>
                </select>
              </div>
            </div>

            {/* Itens Solicitados */}
            <div className="space-y-2 border-t pt-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#202124]">Itens da Solicitação</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const nextCat =
                      DEFAULT_CATALOG[newOrderForm.items.length % DEFAULT_CATALOG.length]!;
                    setNewOrderForm({
                      ...newOrderForm,
                      items: [
                        ...newOrderForm.items,
                        {
                          productId: nextCat.id,
                          commercialUnit: nextCat.commercialUnit,
                          factorToBase: nextCat.factorToBase,
                          qtyCommercial: 2,
                          unitCost: 1.5,
                        },
                      ],
                    });
                  }}
                  className="h-7 text-xs"
                >
                  + Adicionar Item
                </Button>
              </div>

              <div className="space-y-2">
                {newOrderForm.items.map((item, idx) => {
                  const prod = DEFAULT_CATALOG.find((p) => p.id === item.productId);
                  const totalBase = item.qtyCommercial * item.factorToBase;

                  return (
                    <div
                      key={idx}
                      className="p-3 border rounded-lg bg-[#F5F6F8] grid gap-2 sm:grid-cols-5 items-center"
                    >
                      <div className="sm:col-span-2 space-y-1">
                        <Label className="text-[10px]">Produto Acabado</Label>
                        <select
                          value={item.productId}
                          onChange={(e) => {
                            const selected = DEFAULT_CATALOG.find((p) => p.id === e.target.value)!;
                            const items = [...newOrderForm.items];
                            items[idx] = {
                              ...items[idx]!,
                              productId: selected.id,
                              commercialUnit: selected.commercialUnit,
                              factorToBase: selected.factorToBase,
                            };
                            setNewOrderForm({ ...newOrderForm, items });
                          }}
                          className="w-full rounded border bg-background px-2 py-1 text-xs"
                        >
                          {DEFAULT_CATALOG.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.description} ({c.commercialUnit} c/ {c.factorToBase} {c.baseUnit})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px]">Qtd ({item.commercialUnit})</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.qtyCommercial}
                          onChange={(e) => {
                            const items = [...newOrderForm.items];
                            items[idx]!.qtyCommercial = Number(e.target.value);
                            setNewOrderForm({ ...newOrderForm, items });
                          }}
                          required
                          className="h-8 text-xs"
                        />
                      </div>

                      <div className="space-y-1 text-center">
                        <Label className="text-[10px]">Total Base</Label>
                        <p className="font-bold text-xs text-[#202124] pt-1">
                          {totalBase} {prod?.baseUnit || "UN"}
                        </p>
                      </div>

                      <div className="flex justify-end pt-3 sm:pt-0">
                        {newOrderForm.items.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const items = newOrderForm.items.filter((_, i) => i !== idx);
                              setNewOrderForm({ ...newOrderForm, items });
                            }}
                            className="h-7 text-xs text-red-600"
                          >
                            <X className="size-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="ord-notes">Observações Comerciais</Label>
              <Input
                id="ord-notes"
                placeholder="Ex.: Priorizar banana chips para atender pedido de distribuidora."
                value={newOrderForm.notes}
                onChange={(e) => setNewOrderForm({ ...newOrderForm, notes: e.target.value })}
              />
            </div>

            <DialogFooter className="border-t pt-3">
              <Button type="button" variant="outline" onClick={() => setOpenNewOrderModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-[#B5121B] hover:bg-[#8f0d14] text-white">
                Emitir Ordem à Indústria
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Recebimento Conferido */}
      <Dialog open={openReceiptModal} onOpenChange={setOpenReceiptModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#202124]">
              Recebimento Conferido — {selectedOrder?.orderNumber}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Conferir entrega física de produtos acabados da indústria. Apenas quantidades aceitas
              geram entrada no estoque comercial.
            </p>
          </DialogHeader>

          <form onSubmit={handleSubmitReceipt} className="space-y-4 text-xs">
            <div className="grid gap-3 sm:grid-cols-3 bg-[#F5F6F8] p-3 rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="rec-date">Data do Recebimento</Label>
                <Input
                  id="rec-date"
                  type="date"
                  value={receiptForm.receiptDate}
                  onChange={(e) => setReceiptForm({ ...receiptForm, receiptDate: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="rec-doc">Doc. Referência / Romaneio</Label>
                <Input
                  id="rec-doc"
                  placeholder="Ex.: Romaneio 883 / NF 104"
                  value={receiptForm.documentRef}
                  onChange={(e) => setReceiptForm({ ...receiptForm, documentRef: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="rec-resp">Conferente Responsável</Label>
                <Input
                  id="rec-resp"
                  value={receiptForm.responsible}
                  onChange={(e) => setReceiptForm({ ...receiptForm, responsible: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Itens para Conferência */}
            <div className="space-y-3">
              <span className="font-bold text-sm text-[#202124]">
                Conferência de Quantidades (Aceito vs Rejeitado)
              </span>

              {receiptForm.items.map((item, idx) => {
                const totalAcceptedBase = item.qtyAcceptedCommercial * item.factorToBase;
                const totalRejectedBase = item.qtyRejectedCommercial * item.factorToBase;

                return (
                  <div key={idx} className="p-3 border rounded-lg bg-card space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-[#202124]">
                        {item.productDescription}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Fator: {item.factorToBase} UN / {item.commercialUnit} · Saldo ordem:{" "}
                        {item.qtyRemainingBase} UN
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-4 items-center">
                      <div className="space-y-1">
                        <Label className="text-[10px]">Entregue ({item.commercialUnit})</Label>
                        <Input
                          type="number"
                          min="0"
                          value={item.qtyDeliveredCommercial}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            const items = [...receiptForm.items];
                            items[idx]!.qtyDeliveredCommercial = val;
                            items[idx]!.qtyAcceptedCommercial = val;
                            items[idx]!.qtyRejectedCommercial = 0;
                            setReceiptForm({ ...receiptForm, items });
                          }}
                          required
                          className="h-8"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] text-green-700 font-bold">
                          Aceito (Gera Estoque)
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          max={item.qtyDeliveredCommercial}
                          value={item.qtyAcceptedCommercial}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            const items = [...receiptForm.items];
                            items[idx]!.qtyAcceptedCommercial = val;
                            items[idx]!.qtyRejectedCommercial = Math.max(
                              0,
                              items[idx]!.qtyDeliveredCommercial - val,
                            );
                            setReceiptForm({ ...receiptForm, items });
                          }}
                          required
                          className="h-8 border-green-300"
                        />
                        <span className="text-[10px] text-green-700 block font-semibold">
                          +{totalAcceptedBase} UN no estoque
                        </span>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] text-red-700 font-bold">Rejeitado</Label>
                        <Input
                          type="number"
                          min="0"
                          value={item.qtyRejectedCommercial}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            const items = [...receiptForm.items];
                            items[idx]!.qtyRejectedCommercial = val;
                            items[idx]!.qtyAcceptedCommercial = Math.max(
                              0,
                              items[idx]!.qtyDeliveredCommercial - val,
                            );
                            setReceiptForm({ ...receiptForm, items });
                          }}
                          required
                          className="h-8 border-red-300"
                        />
                        {totalRejectedBase > 0 && (
                          <span className="text-[10px] text-red-700 block font-semibold">
                            {totalRejectedBase} UN não aceitas
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px]">Lote & Validade</Label>
                        <Input
                          placeholder="Lote"
                          value={item.lotNumber}
                          onChange={(e) => {
                            const items = [...receiptForm.items];
                            items[idx]!.lotNumber = e.target.value;
                            setReceiptForm({ ...receiptForm, items });
                          }}
                          className="h-8"
                        />
                      </div>
                    </div>

                    {item.qtyRejectedCommercial > 0 && (
                      <div className="space-y-1 bg-red-50 p-2 rounded border border-red-200">
                        <Label className="text-[10px] text-red-800 font-bold">
                          Motivo Obrigatório da Rejeição
                        </Label>
                        <Input
                          placeholder="Ex.: Embalagem amassada, lacre rompido ou peso divergente"
                          value={item.rejectionReason}
                          onChange={(e) => {
                            const items = [...receiptForm.items];
                            items[idx]!.rejectionReason = e.target.value;
                            setReceiptForm({ ...receiptForm, items });
                          }}
                          required
                          className="h-8 bg-white"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="space-y-1">
              <Label htmlFor="rec-notes">Observações do Recebimento</Label>
              <Input
                id="rec-notes"
                value={receiptForm.notes}
                onChange={(e) => setReceiptForm({ ...receiptForm, notes: e.target.value })}
              />
            </div>

            <DialogFooter className="border-t pt-3">
              <Button type="button" variant="outline" onClick={() => setOpenReceiptModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-[#B5121B] hover:bg-[#8f0d14] text-white">
                Gravar Entrada no Estoque Conferido
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Atualizar Andamento na Fábrica */}
      <Dialog open={openStatusModal} onOpenChange={setOpenStatusModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#202124]">
              Atualizar Status da Indústria — {selectedOrder?.orderNumber}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Registrar o retorno operacional informado pela fábrica parceira.
            </p>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <Label>Status Informado pela Indústria</Label>
              <select
                value={statusUpdateForm.newStatus}
                onChange={(e) =>
                  setStatusUpdateForm({
                    ...statusUpdateForm,
                    newStatus: e.target.value as IndustryOrderStatus,
                  })
                }
                className="w-full rounded border bg-background px-3 py-2 text-xs"
              >
                <option value="enviada">Enviada à Fábrica</option>
                <option value="confirmada">Confirmada pela Fábrica</option>
                <option value="em_producao">Em Produção no Parque Fabril</option>
                <option value="pronta">Pronta para Expedição/Coleta</option>
                <option value="encerrada">Encerrada</option>
                <option value="cancelada">Cancelada</option>
              </select>
              <p className="text-[11px] text-amber-700 mt-1">
                * Marcar como "pronta" indica que o lote está pronto na fábrica, mas{" "}
                <strong>não baixa nem gera entrada física de estoque</strong> até a conferência no
                comércio.
              </p>
            </div>

            <div className="space-y-1">
              <Label>Previsão Confirmada pela Fábrica</Label>
              <Input
                type="date"
                value={statusUpdateForm.confirmedDate}
                onChange={(e) =>
                  setStatusUpdateForm({ ...statusUpdateForm, confirmedDate: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter className="border-t pt-3">
            <Button variant="outline" onClick={() => setOpenStatusModal(false)}>
              Fechar
            </Button>
            <Button
              onClick={handleSaveStatus}
              className="bg-[#B5121B] hover:bg-[#8f0d14] text-white"
            >
              Salvar Andamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: Espelho / Documento Comercial de Solicitação */}
      <Dialog open={openPrintModal} onOpenChange={setOpenPrintModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedOrder && (
            <div className="space-y-4 p-4 text-[#202124] text-xs">
              {/* Cabeçalho Oficial Ki Delícia */}
              <div className="flex items-center justify-between border-b-2 border-[#ED1C24] pb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#B5121B]">
                    BISCOITOS KI DELÍCIA
                  </span>
                  <h2 className="text-xl font-black text-[#202124]">
                    Ordem de Produção à Indústria
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Solicitação Comercial de Produtos Acabados
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-[#ED1C24]">
                    {selectedOrder.orderNumber}
                  </span>
                  <p className="text-[10px] text-muted-foreground">
                    Emissão: {dateBR(selectedOrder.emissionDate)}
                  </p>
                </div>
              </div>

              {/* Dados da Solicitação */}
              <div className="grid grid-cols-2 gap-3 bg-[#F5F6F8] p-3 rounded">
                <div>
                  <span className="text-muted-foreground">Indústria Fornecedora:</span>
                  <p className="font-bold">{selectedOrder.industryName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Data Solicitada de Entrega:</span>
                  <p className="font-bold">{dateBR(selectedOrder.solicitedDate)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Prioridade Comercial:</span>
                  <p className="font-bold uppercase">{selectedOrder.priority}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status Atual:</span>
                  <p className="font-bold uppercase">
                    {selectedOrder.industryStatus.replace("_", " ")}
                  </p>
                </div>
              </div>

              {/* Tabela de Itens */}
              <div className="border rounded overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-[#202124] text-white text-[11px]">
                    <tr>
                      <th className="p-2">Item / Descrição</th>
                      <th className="p-2">Apresentação</th>
                      <th className="p-2 text-right">Qtd Comercial</th>
                      <th className="p-2 text-right">Qtd Base</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs">
                    {selectedOrder.items.map((i, idx) => (
                      <tr key={idx}>
                        <td className="p-2 font-semibold">
                          {i.productDescription}
                          <span className="block text-[10px] text-muted-foreground font-mono">
                            {i.productSku}
                          </span>
                        </td>
                        <td className="p-2 text-muted-foreground">
                          {i.commercialUnit} c/ {i.factorToBase} UN
                        </td>
                        <td className="p-2 text-right font-bold">
                          {i.qtyCommercial} {i.commercialUnit}
                        </td>
                        <td className="p-2 text-right tabular-nums">{i.qtyBase} UN</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Termo de Recebimento */}
              <div className="mt-6 border-t pt-4 grid grid-cols-2 gap-6 text-[10px] text-center text-muted-foreground">
                <div className="border-t pt-2">
                  Assinatura / Carimbo do Solicitante (Comércio Ki Delícia)
                </div>
                <div className="border-t pt-2">Assinatura / De Acordo da Indústria Fornecedora</div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-3">
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer className="mr-1 size-3.5" /> Imprimir Documento
                </Button>
                <Button
                  size="sm"
                  onClick={() => setOpenPrintModal(false)}
                  className="bg-[#202124] text-white"
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
