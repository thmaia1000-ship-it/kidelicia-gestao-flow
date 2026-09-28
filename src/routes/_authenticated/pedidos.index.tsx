import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/pedidos/")({
  head: () => ({
    meta: [
      { title: "Pedidos e vendas — Ki Delícia Gestão" },
      {
        name: "description",
        content:
          "Pedidos com numeração interna própria, referências legadas preservadas e status separados de produção, expedição e financeiro.",
      },
      { property: "og:title", content: "Pedidos e vendas — Ki Delícia Gestão" },
      { property: "og:description", content: "Pedidos com numeração interna e status separados." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
  customers: { legal_name: string; trade_name: string | null } | null;
};

function Pedidos() {
  const { data: membership } = useMembership();
  const orgId = membership?.organization?.id;
  const canWrite = canWriteCommercial(membership?.roles ?? []);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");

  const list = useQuery({
    queryKey: ["order", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_orders")
        .select(
          "id, number, order_date, status, total, legacy_order_ref, customers(legal_name, trade_name)",
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

  const columns: Column<Row>[] = [
    { key: "number", header: "Nº interno", value: (r) => r.number },
    {
      key: "cliente",
      header: "Cliente",
      value: (r) => r.customers?.trade_name ?? r.customers?.legal_name ?? "",
      render: (r) => r.customers?.trade_name || r.customers?.legal_name || "—",
    },
    {
      key: "order_date",
      header: "Data",
      value: (r) => r.order_date,
      render: (r) => dateBR(r.order_date),
    },
    { key: "legacy_order_ref", header: "Ref. legada", render: (r) => r.legacy_order_ref || "—" },
    { key: "status", header: "Situação comercial" },
    {
      key: "total",
      header: "Total",
      align: "right",
      value: (r) => Number(r.total),
      render: (r) => brl(r.total),
      sum: true,
      sumFormat: brl,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Pedidos e vendas"
        description="Números legados (VENDA/PEDIDO) são apenas referências não exclusivas. Confirmação operacional com reservas e títulos entra na Fase 3."
        actions={
          canWrite ? (
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" /> Novo pedido direto
            </Button>
          ) : null
        }
      />
      <DataTable
        columns={columns}
        rows={list.data ?? []}
        rowKey={(r) => r.id}
        loading={list.isLoading}
        onRowClick={(r) => navigate({ to: "/pedidos/$id", params: { id: r.id } })}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo pedido</DialogTitle>
            <DialogDescription>
              O endereço e a condição do cliente são copiados como histórico do pedido.
            </DialogDescription>
          </DialogHeader>
          <Field label="Cliente *">
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {(customers.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.trade_name || c.legal_name}
                </option>
              ))}
            </select>
          </Field>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>
              {create.isPending ? "Criando..." : "Criar rascunho"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
