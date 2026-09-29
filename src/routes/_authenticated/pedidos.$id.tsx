import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Truck,
  AlertTriangle,
  XCircle,
  Printer,
  Factory,
  ArrowLeft,
  Calendar,
  CreditCard,
  Building2,
  Package,
} from "lucide-react";
import { toast } from "sonner";

import { ItemsEditor } from "@/components/items-editor";
import { PageHeader } from "@/components/page-header";
import { Field } from "@/routes/_authenticated/clientes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { brl, dateBR } from "@/lib/fmt";
import { canWriteCommercial, useMembership } from "@/lib/session";
import { CommercialStore } from "@/lib/commercial-store";

export const Route = createFileRoute("/_authenticated/pedidos/$id")({
  head: () => ({
    meta: [
      { title: "Pedido de Venda — Ki Delícia Gestão" },
      {
        name: "description",
        content:
          "Detalhe do pedido com itens, referências das planilhas, reserva de estoque e expedição.",
      },
      { property: "og:title", content: "Pedido de Venda — Ki Delícia Gestão" },
      {
        property: "og:description",
        content: "Itens, condições e expedição do pedido comercial Ki Delícia.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PedidoDetalhe,
});

function PedidoDetalhe() {
  const { id } = Route.useParams();
  const { data: membership } = useMembership();
  const orgId = membership?.organization?.id;
  const userEmail = membership?.email || "operador@kidelicia.com";
  const canWrite = canWriteCommercial(membership?.roles ?? []);
  const queryClient = useQueryClient();

  const [openShipModal, setOpenShipModal] = useState(false);
  const [openPrintModal, setOpenPrintModal] = useState(false);
  const [openShortageModal, setOpenShortageModal] = useState(false);
  const [shortageItemsState, setShortageItemsState] = useState<
    { productId: string; shortageBase: number }[]
  >([]);

  const order = useQuery({
    queryKey: ["order", "one", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_orders")
        .select(
          "*, customers(legal_name, trade_name, price_list_id, document, state_registration, address)",
        )
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Record<string, unknown>;
    },
  });

  const orderItemsQuery = useQuery({
    queryKey: ["order_items", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_order_items")
        .select("*")
        .eq("sales_order_id", id);
      if (error) throw error;
      return data || [];
    },
  });

  const update = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const { error } = await supabase
        .from("sales_orders")
        .update(patch as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pedido atualizado.");
      order.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (order.isLoading || !order.data)
    return <p className="text-muted-foreground p-6">Carregando pedido...</p>;
  const o = order.data;
  const items = orderItemsQuery.data || [];
  const customer = o.customers as {
    trade_name?: string;
    legal_name?: string;
    price_list_id?: string;
    document?: string;
    state_registration?: string;
    address?: Record<string, unknown>;
  } | null;
  const snapshot = (o.customer_snapshot ?? {}) as Record<string, unknown>;
  const editable = canWrite && o.status === "rascunho";
  const isConfirmed = o.status === "confirmado";
  const isCancelled = o.status === "cancelado";
  const isShipped = o.shipping_status === "concluido";

  const reservations = orgId
    ? CommercialStore.getReservations(orgId).filter((r) => r.salesOrderId === id)
    : [];
  const currentShortage = reservations.filter((r) => r.status === "ativa" && r.qtyShortageBase > 0);

  // AÇÃO 1: CONFIRMAR PEDIDO E RESERVAR ESTOQUE
  async function handleConfirmOrder() {
    if (!orgId) return;
    if (items.length === 0) {
      toast.error("O pedido precisa conter ao menos um item antes de ser confirmado.");
      return;
    }

    try {
      // Executa reserva no estoque funcional
      const res = CommercialStore.reserveStockForOrder(
        orgId,
        id,
        String(o.number),
        items.map((i) => ({ productId: i.product_id, qtyBaseNeeded: Number(i.qty_base) })),
      );

      // Atualiza status no banco Supabase
      const { error } = await supabase
        .from("sales_orders")
        .update({
          status: "confirmado",
          confirmed_at: new Date().toISOString(),
          production_status: res.hasShortage ? "parcial" : "concluido",
          shipping_status: "nao_iniciado",
        } as never)
        .eq("id", id);

      if (error) throw error;

      if (res.hasShortage) {
        setShortageItemsState(res.shortageItems);
        toast.warning(
          `Pedido #${o.number} confirmado! Houve falta de estoque para ${res.shortageItems.length} item(ns). Estoque disponível foi reservado.`,
        );
        setOpenShortageModal(true);
      } else {
        toast.success(`Pedido #${o.number} confirmado com sucesso! Estoque 100% reservado.`);
      }

      order.refetch();
      orderItemsQuery.refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao confirmar pedido");
    }
  }

  // AÇÃO 2: EXPEDIR PEDIDO (BAIXA FÍSICO E RESERVA)
  function handleShipOrder() {
    if (!orgId) return;
    try {
      CommercialStore.shipOrder(
        orgId,
        id,
        String(o.number),
        items.map((i) => ({ productId: i.product_id, qtyBaseToShip: Number(i.qty_base) })),
        userEmail,
      );

      supabase
        .from("sales_orders")
        .update({
          shipping_status: "concluido",
        } as never)
        .eq("id", id)
        .then(() => {
          toast.success(`Expedição realizada! Estoque físico baixado e reserva liquidada.`);
          setOpenShipModal(false);
          order.refetch();
        });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao expedir");
    }
  }

  // AÇÃO 3: CANCELAR PEDIDO (LIBERA RESERVAS)
  async function handleCancelOrder() {
    if (!orgId) return;
    if (
      !window.confirm(
        "Deseja realmente cancelar este pedido? As reservas de estoque serão liberadas imediatamente.",
      )
    ) {
      return;
    }

    try {
      CommercialStore.cancelOrderReservations(orgId, id);

      const { error } = await supabase
        .from("sales_orders")
        .update({
          status: "cancelado",
          cancelled_at: new Date().toISOString(),
          cancel_reason: "Cancelamento solicitado pelo usuário",
        } as never)
        .eq("id", id);

      if (error) throw error;
      toast.info(`Pedido #${o.number} cancelado. Reservas de estoque liberadas.`);
      order.refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao cancelar pedido");
    }
  }

  // Criar Ordem à Indústria para suprir falta
  function handleCreateShortageOrder() {
    if (!orgId) return;
    try {
      const orderItemsToSolicit = shortageItemsState.map((s) => {
        const item = items.find((i) => i.product_id === s.productId);
        const factor = item ? Number(item.factor_to_base) : 40;
        const commUnit = item ? item.commercial_unit : "FARDO";
        const qtyComm = Math.ceil(s.shortageBase / factor);
        return {
          productId: s.productId,
          commercialUnit: commUnit,
          factorToBase: factor,
          qtyCommercial: qtyComm,
        };
      });

      CommercialStore.createIndustryOrder(orgId, {
        industryName: "Indústria Ki Delícia Ltda",
        solicitedDate: new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0]!,
        priority: "alta",
        origin: "pedidos",
        relatedOrderNumbers: [`Pedido #${o.number}`],
        notes: `Atendimento urgente para suprir falta no Pedido #${o.number} (${customer?.trade_name || customer?.legal_name}).`,
        items: orderItemsToSolicit,
      });

      toast.success("Ordem à indústria gerada automaticamente e vinculada a este pedido!");
      setOpenShortageModal(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar ordem");
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              to="/pedidos"
              className="text-xs text-muted-foreground hover:text-[#B5121B] flex items-center gap-1"
            >
              <ArrowLeft className="size-3" /> Voltar para Pedidos
            </Link>
            <span className="text-xs text-muted-foreground">·</span>
            <span
              className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${
                o.status === "confirmado"
                  ? "bg-green-100 text-green-800"
                  : o.status === "cancelado"
                    ? "bg-red-100 text-red-800"
                    : "bg-amber-100 text-amber-800"
              }`}
            >
              {o.status as string}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#202124] mt-1">
            Pedido de Venda nº {o.number as number}
          </h1>
          <p className="text-sm text-muted-foreground">
            Cliente: <strong>{customer?.trade_name || customer?.legal_name || "—"}</strong> ·
            Emissão: {dateBR(o.order_date as string)} · Total:{" "}
            <strong>{brl(o.total as number)}</strong>
          </p>
        </div>

        {/* Botões de Ação do Pedido */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpenPrintModal(true)}
            className="text-xs"
          >
            <Printer className="mr-1.5 size-3.5" /> Espelho / PDF
          </Button>

          {editable && (
            <Button
              size="sm"
              onClick={handleConfirmOrder}
              className="bg-[#B5121B] hover:bg-[#8f0d14] text-white text-xs font-bold shadow-sm"
            >
              <CheckCircle2 className="mr-1.5 size-4" /> Confirmar Pedido e Reservar Estoque
            </Button>
          )}

          {isConfirmed && !isShipped && (
            <Button
              size="sm"
              onClick={() => setOpenShipModal(true)}
              className="bg-[#1e7e34] hover:bg-[#155d27] text-white text-xs font-bold shadow-sm"
            >
              <Truck className="mr-1.5 size-4" /> Realizar Expedição
            </Button>
          )}

          {isConfirmed && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelOrder}
              className="border-red-300 text-red-700 hover:bg-red-50 text-xs"
            >
              <XCircle className="mr-1.5 size-3.5" /> Cancelar Pedido
            </Button>
          )}
        </div>
      </div>

      {/* Alerta de Falta de Estoque Vinculada */}
      {currentShortage.length > 0 && isConfirmed && !isShipped && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-xs text-red-900 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="size-5 text-red-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-red-900">
                Aguardando Atendimento da Indústria (Falta de Estoque)
              </p>
              <p className="mt-0.5 text-red-800">
                Este pedido possui itens com saldo insuficiente no estoque físico comercial. O saldo
                disponível foi reservado com sucesso, restando{" "}
                {currentShortage.reduce((s, r) => s + r.qtyShortageBase, 0)} UN aguardando entrega
                da indústria.
              </p>
            </div>
          </div>

          <Button
            asChild
            size="sm"
            variant="outline"
            className="bg-white border-red-300 text-red-900 shrink-0"
          >
            <Link to="/producao">
              <Factory className="mr-1.5 size-3.5" /> Acompanhar Ordens
            </Link>
          </Button>
        </div>
      )}

      {/* Situação em Cards Rápidos */}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-3 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Situação Comercial
          </p>
          <p className="text-sm font-black text-[#202124] capitalize mt-0.5">
            {o.status as string}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-3 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Suprimento / Produção
          </p>
          <p className="text-sm font-black text-[#202124] mt-0.5">
            {currentShortage.length > 0 ? (
              <span className="text-amber-700">Aguardando Indústria</span>
            ) : isConfirmed ? (
              <span className="text-green-700">Estoque 100% Reservado</span>
            ) : (
              "Rascunho Comercial"
            )}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-3 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Expedição
          </p>
          <p className="text-sm font-black text-[#202124] mt-0.5">
            {isShipped ? (
              <span className="text-green-700">Expedido / Entregue</span>
            ) : isConfirmed ? (
              <span className="text-blue-700">Pronto para Expedir</span>
            ) : (
              "Não Liberado"
            )}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-3 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Condição Financeira
          </p>
          <p className="text-sm font-black text-[#202124] mt-0.5">
            {(o.payment_terms as string) || "À vista / Não informada"}
          </p>
        </div>
      </div>

      {/* Dados do Cabeçalho e Referências das Planilhas */}
      <div className="grid gap-4 rounded-xl border bg-card p-5 shadow-xs sm:grid-cols-3 text-xs">
        <Field label="Data do Pedido">
          <Input
            type="date"
            defaultValue={(o.order_date as string) ?? ""}
            disabled={!editable}
            onBlur={(e) => update.mutate({ order_date: e.target.value })}
            className="h-9"
          />
        </Field>
        <Field label="Previsão de Entrega">
          <Input
            type="date"
            defaultValue={(o.delivery_date as string) ?? ""}
            disabled={!editable}
            onBlur={(e) => update.mutate({ delivery_date: e.target.value || null })}
            className="h-9"
          />
        </Field>
        <Field label="Condição de Pagamento">
          <Input
            defaultValue={(o.payment_terms as string) ?? ""}
            disabled={!editable}
            placeholder="Ex.: 30/60 dias boleto ou à vista"
            onBlur={(e) => update.mutate({ payment_terms: e.target.value || null })}
            className="h-9"
          />
        </Field>

        <Field label="Referência Legada VENDA (Planilha)">
          <Input
            defaultValue={(o.legacy_sale_ref as string) ?? ""}
            disabled={!editable}
            placeholder="Ex.: 832"
            onBlur={(e) => update.mutate({ legacy_sale_ref: e.target.value || null })}
            className="h-9 font-mono"
          />
        </Field>
        <Field label="Referência Legada PEDIDO (Planilha)">
          <Input
            defaultValue={(o.legacy_order_ref as string) ?? ""}
            disabled={!editable}
            placeholder="Ex.: 676"
            onBlur={(e) => update.mutate({ legacy_order_ref: e.target.value || null })}
            className="h-9 font-mono"
          />
        </Field>
        <Field label="Data de Vencimento Informada">
          <Input
            type="date"
            defaultValue={(o.due_date as string) ?? ""}
            disabled={!editable}
            onBlur={(e) => update.mutate({ due_date: e.target.value || null })}
            className="h-9"
          />
        </Field>

        <Field label="Desconto Comercial (R$)">
          <Input
            type="number"
            step="0.01"
            min="0"
            defaultValue={String(o.discount ?? 0)}
            disabled={!editable}
            onBlur={(e) => update.mutate({ discount: Number(e.target.value) || 0 })}
            className="h-9 font-mono"
          />
        </Field>
        <Field label="Frete (R$)">
          <Input
            type="number"
            step="0.01"
            min="0"
            defaultValue={String(o.freight ?? 0)}
            disabled={!editable}
            onBlur={(e) => update.mutate({ freight: Number(e.target.value) || 0 })}
            className="h-9 font-mono"
          />
        </Field>
        <Field label="Total do Pedido">
          <Input
            value={brl(o.total as number)}
            disabled
            className="h-9 font-black text-[#202124] bg-muted/30"
          />
        </Field>

        <Field label="Observações do Pedido" className="sm:col-span-3">
          <Textarea
            defaultValue={(o.notes as string) ?? ""}
            disabled={!editable}
            placeholder="Observações comerciais, local de entrega ou instruções de faturamento..."
            onBlur={(e) => update.mutate({ notes: e.target.value || null })}
            className="text-xs"
          />
        </Field>
      </div>

      {/* Editor de Itens com Fator e Unidade Comercial */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#202124]">Itens do Pedido</h2>
            <p className="text-xs text-muted-foreground">
              Unidades comerciais (ex.: FARDO) e conversão para unidade base de estoque (UN)
            </p>
          </div>
        </div>

        {orgId && (
          <ItemsEditor
            kind="order"
            parentId={id}
            orgId={orgId}
            readOnly={!editable}
            customerPriceListId={customer?.price_list_id ?? null}
          />
        )}
      </div>

      {/* MODAL 1: Expedição */}
      <Dialog open={openShipModal} onOpenChange={setOpenShipModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#202124]">
              Confirmar Expedição — Pedido #{o.number}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              A expedição baixa o estoque físico comercial e consome a reserva correspondente uma
              única vez.
            </p>
          </DialogHeader>

          <div className="space-y-3 text-xs bg-[#F5F6F8] p-3 rounded-lg">
            <p className="font-semibold text-[#202124]">
              Cliente: {customer?.trade_name || customer?.legal_name}
            </p>
            <p className="text-muted-foreground">
              Total de itens a expedir: <strong>{items.length} produto(s)</strong>
            </p>
            <p className="text-[11px] text-amber-800">
              * Ao confirmar, os produtos são liberados para entrega ao cliente e o status do pedido
              passa para "Expedido".
            </p>
          </div>

          <DialogFooter className="border-t pt-3">
            <Button variant="outline" size="sm" onClick={() => setOpenShipModal(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleShipOrder}
              className="bg-[#1e7e34] hover:bg-[#155d27] text-white font-bold"
            >
              Confirmar Saída e Baixar Estoque
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Alerta e Ação de Falta de Estoque */}
      <Dialog open={openShortageModal} onOpenChange={setOpenShortageModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#202124] flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-600" /> Falta de Estoque Detectada
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              O estoque disponível foi reservado. Deseja emitir uma Ordem à Indústria para produzir
              o faltante?
            </p>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div className="border rounded p-3 bg-red-50 text-red-900 space-y-1">
              <p className="font-bold">Itens com falta de estoque:</p>
              {shortageItemsState.map((s, idx) => {
                const item = items.find((i) => i.product_id === s.productId);
                return (
                  <p key={idx} className="text-xs">
                    • {item?.description_snapshot || "Produto"}:{" "}
                    <strong>{s.shortageBase} UN</strong> necessárias
                  </p>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Ao gerar a ordem, ela ficará vinculada ao Pedido #{o.number} para ser atendida assim
              que a indústria entregar o lote conferido.
            </p>
          </div>

          <DialogFooter className="border-t pt-3">
            <Button variant="outline" size="sm" onClick={() => setOpenShortageModal(false)}>
              Depois
            </Button>
            <Button
              size="sm"
              onClick={handleCreateShortageOrder}
              className="bg-[#B5121B] hover:bg-[#8f0d14] text-white font-bold"
            >
              Gerar Ordem à Indústria Agora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Espelho do Pedido para Impressão */}
      <Dialog open={openPrintModal} onOpenChange={setOpenPrintModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-4 space-y-4 text-xs text-[#202124]">
            {/* Header Documento */}
            <div className="flex items-center justify-between border-b-2 border-[#ED1C24] pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#B5121B]">
                  BISCOITOS KI DELÍCIA
                </span>
                <h2 className="text-xl font-black text-[#202124]">Pedido Comercial de Venda</h2>
                <p className="text-xs text-muted-foreground">
                  Documento Comercial Interno · Não Fiscal
                </p>
              </div>
              <div className="text-right">
                <span className="text-base font-black text-[#ED1C24]">
                  Pedido nº {o.number as number}
                </span>
                <p className="text-[10px] text-muted-foreground">
                  Data: {dateBR(o.order_date as string)}
                </p>
              </div>
            </div>

            {/* Dados Cliente */}
            <div className="grid grid-cols-2 gap-3 bg-[#F5F6F8] p-3 rounded text-xs">
              <div>
                <span className="text-muted-foreground">Cliente:</span>
                <p className="font-bold">{customer?.trade_name || customer?.legal_name || "—"}</p>
                <p className="text-muted-foreground">{customer?.document || ""}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Condição de Pagamento:</span>
                <p className="font-bold">{(o.payment_terms as string) || "À vista"}</p>
                {o.due_date && (
                  <p className="text-muted-foreground">
                    Vencimento: {dateBR(o.due_date as string)}
                  </p>
                )}
              </div>
            </div>

            {/* Tabela de Itens */}
            <div className="border rounded overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-[#202124] text-white text-[11px]">
                  <tr>
                    <th className="p-2">Item / Descrição</th>
                    <th className="p-2 text-right">Qtd</th>
                    <th className="p-2 text-right">Fator</th>
                    <th className="p-2 text-right">Qtd Base</th>
                    <th className="p-2 text-right">Preço Unit.</th>
                    <th className="p-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {items.map((i, idx) => (
                    <tr key={idx}>
                      <td className="p-2 font-medium">{i.description_snapshot}</td>
                      <td className="p-2 text-right font-bold">
                        {i.qty_commercial} {i.commercialUnit}
                      </td>
                      <td className="p-2 text-right text-muted-foreground">{i.factor_to_base}</td>
                      <td className="p-2 text-right">{i.qty_base} UN</td>
                      <td className="p-2 text-right">{brl(Number(i.unit_price))}</td>
                      <td className="p-2 text-right font-bold">{brl(Number(i.subtotal))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#F5F6F8] font-bold border-t">
                  <tr>
                    <td colSpan={5} className="p-2 text-right">
                      Total Final do Pedido:
                    </td>
                    <td className="p-2 text-right text-sm text-[#ED1C24]">
                      {brl(o.total as number)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Assinatura / Recebimento */}
            <div className="mt-8 border-t pt-4 grid grid-cols-2 gap-6 text-[10px] text-center text-muted-foreground">
              <div className="border-t pt-2">Ki Delícia Comércio de Alimentos</div>
              <div className="border-t pt-2">Assinatura do Cliente / Canhoto de Recebimento</div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="mr-1 size-3.5" /> Imprimir Pedido
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
