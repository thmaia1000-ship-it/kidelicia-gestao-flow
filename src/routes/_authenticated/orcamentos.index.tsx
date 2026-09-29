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

export const Route = createFileRoute("/_authenticated/orcamentos/")({
  head: () => ({
    meta: [
      { title: "Orçamentos — Ki Delícia Gestão" },
      {
        name: "description",
        content:
          "Orçamentos com validade, revisões e conversão única em pedido, preservando a versão aprovada.",
      },
      { property: "og:title", content: "Orçamentos — Ki Delícia Gestão" },
      {
        property: "og:description",
        content: "Orçamentos com validade, revisões e conversão única.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Orcamentos,
});

type Row = {
  id: string;
  number: number;
  date: string;
  valid_until: string | null;
  status: string;
  total: number;
  customers: { legal_name: string; trade_name: string | null } | null;
};

function Orcamentos() {
  const { data: membership } = useMembership();
  const orgId = membership?.organization?.id;
  const canWrite = canWriteCommercial(membership?.roles ?? []);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");

  const list = useQuery({
    queryKey: ["quote", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("id, number, date, valid_until, status, total, customers(legal_name, trade_name)")
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
        .select("id, legal_name, trade_name")
        .eq("organization_id", orgId!)
        .eq("active", true)
        .order("legal_name");
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!customerId) throw new Error("Selecione o cliente.");
      const { data: number, error: numErr } = await supabase.rpc("next_doc_number", {
        _org: orgId!,
        _type: "orcamento",
      });
      if (numErr) throw numErr;
      const { data, error } = await supabase
        .from("quotes")
        .insert({
          organization_id: orgId,
          number,
          customer_id: customerId,
          date: todayISO(),
          status: "rascunho",
        } as never)
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      setOpen(false);
      navigate({ to: "/orcamentos/$id", params: { id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const columns: Column<Row>[] = [
    { key: "number", header: "Nº", value: (r) => r.number },
    {
      key: "cliente",
      header: "Cliente",
      value: (r) => r.customers?.trade_name ?? r.customers?.legal_name ?? "",
      render: (r) => r.customers?.trade_name || r.customers?.legal_name || "—",
    },
    { key: "date", header: "Data", value: (r) => r.date, render: (r) => dateBR(r.date) },
    {
      key: "valid_until",
      header: "Validade",
      value: (r) => r.valid_until ?? "",
      render: (r) => dateBR(r.valid_until),
    },
    { key: "status", header: "Situação" },
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
        title="Orçamentos"
        description="A marcação “enviado” é manual: não há envio integrado de mensagem nesta fase."
        actions={
          canWrite ? (
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" /> Novo orçamento
            </Button>
          ) : null
        }
      />
      <DataTable
        columns={columns}
        rows={list.data ?? []}
        rowKey={(r) => r.id}
        loading={list.isLoading}
        onRowClick={(r) => navigate({ to: "/orcamentos/$id", params: { id: r.id } })}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo orçamento</DialogTitle>
            <DialogDescription>O orçamento nasce como rascunho editável.</DialogDescription>
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
