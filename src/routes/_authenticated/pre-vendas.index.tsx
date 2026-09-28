import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { DataTable, type Column } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { brl, dateBR, todayISO } from "@/lib/fmt";
import { canWriteCommercial, useMembership } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/pre-vendas/")({
  head: () => ({
    meta: [
      { title: "Pré-vendas — Ki Delícia Gestão" },
      {
        name: "description",
        content:
          "Sugestões de pedido e acompanhamento comercial com status, motivo de perda e conversão controlada em orçamento.",
      },
      { property: "og:title", content: "Pré-vendas — Ki Delícia Gestão" },
      { property: "og:description", content: "Sugestões de pedido e acompanhamento comercial." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PreVendas,
});

type Row = {
  id: string;
  number: number;
  date: string;
  status: string;
  total: number;
  prospect_name: string | null;
  customers: { legal_name: string; trade_name: string | null } | null;
};

function PreVendas() {
  const { data: membership } = useMembership();
  const orgId = membership?.organization?.id;
  const canWrite = canWriteCommercial(membership?.roles ?? []);
  const navigate = useNavigate();

  const list = useQuery({
    queryKey: ["presale", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("presales")
        .select("id, number, date, status, total, prospect_name, customers(legal_name, trade_name)")
        .eq("organization_id", orgId!)
        .order("number", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: number, error: numErr } = await supabase.rpc("next_doc_number", {
        _org: orgId!,
        _type: "prevenda",
      });
      if (numErr) throw numErr;
      const { data, error } = await supabase
        .from("presales")
        .insert({ organization_id: orgId, number, date: todayISO(), status: "rascunho" } as never)
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => navigate({ to: "/pre-vendas/$id", params: { id } }),
    onError: (e: Error) => toast.error(e.message),
  });

  const columns: Column<Row>[] = [
    { key: "number", header: "Nº", value: (r) => r.number },
    {
      key: "cliente",
      header: "Cliente / prospect",
      value: (r) => r.customers?.trade_name ?? r.customers?.legal_name ?? r.prospect_name ?? "",
      render: (r) =>
        r.customers?.trade_name || r.customers?.legal_name || r.prospect_name || "Não informado",
    },
    { key: "date", header: "Data", value: (r) => r.date, render: (r) => dateBR(r.date) },
    { key: "status", header: "Situação" },
    {
      key: "total",
      header: "Valor sugerido",
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
        title="Pré-vendas"
        description="Sugestões continuam documentos separados: nenhuma pré-venda se transforma em venda automaticamente."
        actions={
          canWrite ? (
            <Button onClick={() => create.mutate()} disabled={create.isPending}>
              <Plus className="size-4" /> Nova pré-venda
            </Button>
          ) : null
        }
      />
      <DataTable
        columns={columns}
        rows={list.data ?? []}
        rowKey={(r) => r.id}
        loading={list.isLoading}
        onRowClick={(r) => navigate({ to: "/pre-vendas/$id", params: { id: r.id } })}
      />
    </div>
  );
}
