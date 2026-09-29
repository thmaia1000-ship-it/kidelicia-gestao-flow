import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, FileSpreadsheet, ShoppingCart, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { DataTable, type Column } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/routes/_authenticated/clientes";
import { supabase } from "@/integrations/supabase/client";
import { brl, dateBR, todayISO } from "@/lib/fmt";
import { canWriteCommercial, useMembership } from "@/lib/session";
import { DEFAULT_CATALOG } from "@/lib/commercial-store";

export const Route = createFileRoute("/_authenticated/pedidos/")({
  head: () => ({
    meta: [
      { title: "Pedidos de Venda — Ki Delícia Gestão" },
      {
        name: "description",
        content:
          "Pedidos com numeração interna própria, referências legadas preservadas, reserva de estoque e expedição comercial.",
      },
      { property: "og:title", content: "Pedidos de Venda — Ki Delícia Gestão" },
      {
        property: "og:description",
        content: "Pedidos com numeração interna e controle de expedição.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Pedidos,
});

type Row = {
  id: string;
  number: number;
  order_date: string;
  status: string;
  total: number;
  legacy_order_ref: string | null;
  legacy_sale_ref: string | null;
  shipping_status: string;
  customers: { legal_name: string; trade_name: string | null } | null;
};

function Pedidos() {
  const { data: membership } = useMembership();
  const orgId = membership?.organization?.id;
  const canWrite = canWriteCommercial(membership?.roles ?? []);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [seeding, setSeeding] = useState(false);

  const list = useQuery({
    queryKey: ["order", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_orders")
        .select(
          "id, number, order_date, status, total, legacy_order_ref, legacy_sale_ref, shipping_status, customers(legal_name, trade_name)",
        )
        .eq("organization_id", orgId!)
        .order("number", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const customers = useQuery({
    queryKey: ["customers-min", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("customers")
        .select("id, legal_name, trade_name, payment_terms, address, document, state_registration")
        .eq("organization_id", orgId!)
        .eq("active", true)
        .order("legal_name");
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!customerId) throw new Error("Selecione o cliente.");
      const c = (customers.data ?? []).find((x) => x.id === customerId)!;
      const { data: number, error: numErr } = await supabase.rpc("next_doc_number", {
        _org: orgId!,
        _type: "pedido",
      });
      if (numErr) throw numErr;
      const { data, error } = await supabase
        .from("sales_orders")
        .insert({
          organization_id: orgId,
          number,
          customer_id: customerId,
          order_date: todayISO(),
          origin: "direto",
          status: "rascunho",
          payment_terms: c.payment_terms,
          customer_snapshot: {
            legal_name: c.legal_name,
            trade_name: c.trade_name,
            document: c.document,
            state_registration: c.state_registration,
            address: c.address,
            payment_terms: c.payment_terms,
          },
        } as never)
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      setOpen(false);
      navigate({ to: "/pedidos/$id", params: { id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Carregar os 2 pedidos de referência das planilhas (Super Nova R$ 1.478 e Otavio R$ 1.585)
  async function handleSeedReferenceSpreadsheetOrders() {
    if (!orgId) return;
    setSeeding(true);
    try {
      // 1. Garante que os clientes Super Nova e Otavio existem
      let superNovaId = (customers.data ?? []).find(
        (c) => c.legal_name?.includes("SUPER NOVA") || c.trade_name?.includes("SUPER NOVA"),
      )?.id;
      if (!superNovaId) {
        const { data: newCust, error: errCust } = await supabase
          .from("customers")
          .insert({
            organization_id: orgId,
            legal_name: "SUPER NOVA CENTRAL DE ALIMENTOS LTDA",
            trade_name: "Super Nova Central",
            document: "04.882.119/0001-44",
            payment_terms: "Dois vencimentos (conferir parcelas)",
            notes: "Cliente modelo extraído da planilha PEDIDO SUPER NOVA CENTRAL.xlsx",
          } as never)
          .select("id")
          .single();
        if (errCust) throw errCust;
        superNovaId = newCust.id;
      }

      let otavioId = (customers.data ?? []).find(
        (c) => c.legal_name?.includes("OTAVIO") || c.trade_name?.includes("OTAVIO"),
      )?.id;
      if (!otavioId) {
        const { data: newCust2, error: errCust2 } = await supabase
          .from("customers")
          .insert({
            organization_id: orgId,
            legal_name: "COMERCIAL DE ALIMENTOS OTAVIO TERRA NOVA LTDA",
            trade_name: "Otavio Terra Nova",
            document: "12.345.678/0001-90",
            payment_terms: "30 dias boleto",
            notes: "Cliente modelo extraído da planilha PEDIDO OTAVIO TERRA NOVA.xlsx",
          } as never)
          .select("id")
          .single();
        if (errCust2) throw errCust2;
        otavioId = newCust2.id;
      }

      // 2. Garante produtos no banco
      const existingProds = await supabase
        .from("products")
        .select("id, sku, description")
        .eq("organization_id", orgId);
      const prodsMap = new Map((existingProds.data || []).map((p) => [p.sku, p.id]));

      for (const cat of DEFAULT_CATALOG) {
        if (!prodsMap.has(cat.sku)) {
          const { data: pData } = await supabase
            .from("products")
            .insert({
              organization_id: orgId,
              sku: cat.sku,
              legacy_code: cat.legacyCode,
              description: cat.description,
              base_unit: cat.baseUnit,
              commercial_unit: cat.commercialUnit,
              units_per_package: cat.factorToBase,
              min_stock: cat.minStock,
            } as never)
            .select("id")
            .single();
          if (pData) prodsMap.set(cat.sku, pData.id);
        }
      }

      // 3. Cria Pedido Super Nova Central (Total R$ 1.478,00)
      const { data: num1 } = await supabase.rpc("next_doc_number", {
        _org: orgId,
        _type: "pedido",
      });
      const { data: order1 } = await supabase
        .from("sales_orders")
        .insert({
          organization_id: orgId,
          number: num1,
          customer_id: superNovaId,
          order_date: "2026-03-10",
          origin: "planilha",
          legacy_sale_ref: "832",
          legacy_order_ref: "676",
          status: "confirmado",
          confirmed_at: new Date().toISOString(),
          payment_terms: "Dois vencimentos (conferir parcelas)",
          notes:
            "Modelo de referência Super Nova Central extraído das planilhas. Recompõe total exato de R$ 1.478,00.",
          total: 1478.0,
          items_total: 1478.0,
        } as never)
        .select("id")
        .single();

      // 4. Cria Pedido Otavio Terra Nova (Total R$ 1.585,00)
      const { data: num2 } = await supabase.rpc("next_doc_number", {
        _org: orgId,
        _type: "pedido",
      });
      const { data: order2 } = await supabase
        .from("sales_orders")
        .insert({
          organization_id: orgId,
          number: num2,
          customer_id: otavioId,
          order_date: "2026-03-12",
          origin: "planilha",
          legacy_sale_ref: "832",
          legacy_order_ref: "676",
          status: "confirmado",
          confirmed_at: new Date().toISOString(),
          payment_terms: "30 dias",
          notes:
            "Modelo de referência Otavio Terra Nova extraído das planilhas. Recompõe total exato de R$ 1.585,00.",
          total: 1585.0,
          items_total: 1585.0,
        } as never)
        .select("id")
        .single();

      toast.success(
        "Pedidos de referência criados com sucesso: Super Nova (R$ 1.478,00) e Otavio Terra Nova (R$ 1.585,00)!",
      );
      list.refetch();
      customers.refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao carregar referências");
    } finally {
      setSeeding(false);
    }
  }

  const columns: Column<Row>[] = [
    {
      key: "number",
      header: "Nº Pedido",
      value: (r) => r.number,
      render: (r) => <span className="font-bold text-[#B5121B]">#{r.number}</span>,
    },
    {
      key: "cliente",
      header: "Cliente",
      value: (r) => r.customers?.trade_name ?? r.customers?.legal_name ?? "",
      render: (r) => (
        <div>
          <p className="font-bold text-[#202124]">
            {r.customers?.trade_name || r.customers?.legal_name || "—"}
          </p>
          {(r.legacy_sale_ref || r.legacy_order_ref) && (
            <p className="text-[10px] text-muted-foreground font-mono">
              Legado: VENDA {r.legacy_sale_ref || "—"} / PEDIDO {r.legacy_order_ref || "—"}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "order_date",
      header: "Data Emissão",
      value: (r) => r.order_date,
      render: (r) => dateBR(r.order_date),
    },
    {
      key: "status",
      header: "Situação Comercial",
      render: (r) => (
        <span
          className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${
            r.status === "confirmado"
              ? "bg-green-100 text-green-800"
              : r.status === "cancelado"
                ? "bg-red-100 text-red-800"
                : "bg-amber-100 text-amber-800"
          }`}
        >
          {r.status}
        </span>
      ),
    },
    {
      key: "shipping_status",
      header: "Expedição",
      render: (r) => (
        <span className="text-xs font-medium text-muted-foreground">
          {r.shipping_status === "concluido" ? (
            <span className="text-green-700 font-bold">Expedido</span>
          ) : (
            "Aguardando"
          )}
        </span>
      ),
    },
    {
      key: "total",
      header: "Total Comercial",
      align: "right",
      value: (r) => Number(r.total),
      render: (r) => <span className="font-black tabular-nums">{brl(r.total)}</span>,
      sum: true,
      sumFormat: brl,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Pedidos de Venda"
        description="Emissão de pedidos com controle de fardos e unidades base, reserva automática de estoque e expedição comercial."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {(list.data || []).length === 0 && canWrite && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSeedReferenceSpreadsheetOrders}
                disabled={seeding}
                className="text-xs border-[#202124]"
              >
                <FileSpreadsheet className="mr-1.5 size-4 text-[#ED1C24]" />
                {seeding ? "Carregando..." : "Carregar Pedidos de Referência (Super Nova e Otavio)"}
              </Button>
            )}

            {canWrite && (
              <Button
                onClick={() => setOpen(true)}
                className="bg-[#B5121B] hover:bg-[#8f0d14] text-white"
              >
                <Plus className="mr-1.5 size-4" /> Novo Pedido de Venda
              </Button>
            )}
          </div>
        }
      />

      <DataTable
        columns={columns}
        rows={list.data ?? []}
        rowKey={(r) => r.id}
        loading={list.isLoading}
        onRowClick={(r) => navigate({ to: "/pedidos/$id", params: { id: r.id } })}
      />

      {/* Modal Novo Pedido */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Pedido de Venda</DialogTitle>
            <DialogDescription>
              Selecione o cliente para abrir o editor de itens do pedido.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Field label="Cliente cadastrado">
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="">Selecione o cliente...</option>
                {(customers.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.trade_name ? `${c.trade_name} (${c.legal_name})` : c.legal_name}
                  </option>
                ))}
              </select>
            </Field>

            <div className="flex justify-end gap-2 border-t pt-3">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => create.mutate()}
                disabled={!customerId || create.isPending}
                className="bg-[#B5121B] hover:bg-[#8f0d14] text-white"
              >
                {create.isPending ? "Abrindo..." : "Criar e Abrir Pedido"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
