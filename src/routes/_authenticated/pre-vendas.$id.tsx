import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { ItemsEditor } from "@/components/items-editor";
import { PageHeader } from "@/components/page-header";
import { Field } from "@/routes/_authenticated/clientes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { brl, todayISO } from "@/lib/fmt";
import { canWriteCommercial, useMembership } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/pre-vendas/$id")({
  head: () => ({
    meta: [
      { title: "Pré-venda — Ki Delícia Gestão" },
      {
        name: "description",
        content: "Detalhe da pré-venda com itens sugeridos e acompanhamento.",
      },
      { property: "og:title", content: "Pré-venda — Ki Delícia Gestão" },
      { property: "og:description", content: "Itens sugeridos e acompanhamento comercial." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PreVendaDetalhe,
});

const STATUS = ["rascunho", "em_contato", "proposta", "convertida", "perdida"];

function PreVendaDetalhe() {
  const { id } = Route.useParams();
  const { data: membership } = useMembership();
  const orgId = membership?.organization?.id;
  const canWrite = canWriteCommercial(membership?.roles ?? []);
  const navigate = useNavigate();

  const presale = useQuery({
    queryKey: ["presale", "one", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("presales").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const customers = useQuery({
    queryKey: ["customers-min", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("customers")
        .select("id, legal_name, trade_name, price_list_id")
        .eq("organization_id", orgId!)
        .order("legal_name");
      return data ?? [];
    },
  });

  const salespeople = useQuery({
    queryKey: ["salespeople-min", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("salespeople")
        .select("id, name")
        .eq("organization_id", orgId!)
        .order("name");
      return data ?? [];
    },
  });

  const update = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const { error } = await supabase
        .from("presales")
        .update(patch as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pré-venda salva.");
      presale.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toQuote = useMutation({
    mutationFn: async () => {
      const p = presale.data as Record<string, unknown>;
      if (!p.customer_id) throw new Error("Defina um cliente cadastrado antes de gerar orçamento.");
      const { data: number, error: numErr } = await supabase.rpc("next_doc_number", {
        _org: orgId!,
        _type: "orcamento",
      });
      if (numErr) throw numErr;
      const { data: quote, error } = await supabase
        .from("quotes")
        .insert({
          organization_id: orgId,
          number,
          presale_id: id,
          customer_id: p.customer_id,
          location_id: p.location_id,
          salesperson_id: p.salesperson_id,
          date: todayISO(),
          status: "rascunho",
        } as never)
        .select("id")
        .single();
      if (error) throw error;
      const { data: items } = await supabase.from("presale_items").select("*").eq("presale_id", id);
      if (items?.length) {
        const { error: itErr } = await supabase.from("quote_items").insert(
          items.map((i) => ({
            organization_id: orgId,
            quote_id: quote.id,
            product_id: i.product_id,
            presentation_id: i.presentation_id,
            description_snapshot: i.description_snapshot,
            commercial_unit: i.commercial_unit,
            qty_commercial: i.qty_commercial,
            factor_to_base: i.factor_to_base,
            qty_base: i.qty_base,
            unit_price: i.unit_price,
            discount: i.discount,
          })) as never,
        );
        if (itErr) throw itErr;
      }
      await supabase
        .from("presales")
        .update({ status: "proposta" } as never)
        .eq("id", id);
      return quote.id as string;
    },
    onSuccess: (quoteId) => {
      toast.success("Orçamento criado a partir da pré-venda.");
      navigate({ to: "/orcamentos/$id", params: { id: quoteId } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicate = useMutation({
    mutationFn: async () => {
      const p = presale.data as Record<string, unknown>;
      const { data: number, error: numErr } = await supabase.rpc("next_doc_number", {
        _org: orgId!,
        _type: "prevenda",
      });
      if (numErr) throw numErr;
      const { data: novo, error } = await supabase
        .from("presales")
        .insert({
          organization_id: orgId,
          number,
          customer_id: p.customer_id,
          location_id: p.location_id,
          salesperson_id: p.salesperson_id,
          prospect_name: p.prospect_name,
          date: todayISO(),
          status: "rascunho",
          origin: "duplicada",
          duplicated_from: id,
        } as never)
        .select("id")
        .single();
      if (error) throw error;
      const { data: items } = await supabase.from("presale_items").select("*").eq("presale_id", id);
      if (items?.length) {
        await supabase.from("presale_items").insert(
          items.map((i) => ({
            organization_id: orgId,
            presale_id: novo.id,
            product_id: i.product_id,
            presentation_id: i.presentation_id,
            description_snapshot: i.description_snapshot,
            commercial_unit: i.commercial_unit,
            qty_commercial: i.qty_commercial,
            factor_to_base: i.factor_to_base,
            qty_base: i.qty_base,
            unit_price: i.unit_price,
            discount: i.discount,
          })) as never,
        );
      }
      return novo.id as string;
    },
    onSuccess: (newId) => {
      toast.success("Nova pré-venda criada como referência independente.");
      navigate({ to: "/pre-vendas/$id", params: { id: newId } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (presale.isLoading || !presale.data) {
    return <p className="text-muted-foreground">Carregando...</p>;
  }
  const p = presale.data as Record<string, unknown>;
  const customer = (customers.data ?? []).find((c) => c.id === p.customer_id);
  const readOnly = !canWrite || p.status === "convertida";

  return (
    <div>
      <PageHeader
        title={`Pré-venda nº ${p.number}`}
        description={`Situação: ${p.status} · Total sugerido ${brl(p.total as number)}`}
        actions={
          <>
            <Link to="/pre-vendas" className="text-sm underline self-center">
              Voltar
            </Link>
            {canWrite && (
              <>
                <Button variant="outline" onClick={() => duplicate.mutate()}>
                  Duplicar para reposição
                </Button>
                <Button onClick={() => toQuote.mutate()} disabled={toQuote.isPending}>
                  Gerar orçamento
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-3">
        <Field label="Cliente cadastrado">
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={(p.customer_id as string) ?? ""}
            disabled={readOnly}
            onChange={(e) => update.mutate({ customer_id: e.target.value || null })}
          >
            <option value="">Prospect (sem cadastro)</option>
            {(customers.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.trade_name || c.legal_name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Nome do prospect">
          <Input
            defaultValue={(p.prospect_name as string) ?? ""}
            disabled={readOnly}
            onBlur={(e) => update.mutate({ prospect_name: e.target.value || null })}
          />
        </Field>
        <Field label="Responsável">
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={(p.salesperson_id as string) ?? ""}
            disabled={readOnly}
            onChange={(e) => update.mutate({ salesperson_id: e.target.value || null })}
          >
            <option value="">Não definido</option>
            {(salespeople.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Data">
          <Input
            type="date"
            defaultValue={(p.date as string) ?? ""}
            disabled={readOnly}
            onBlur={(e) => update.mutate({ date: e.target.value })}
          />
        </Field>
        <Field label="Previsão de entrega">
          <Input
            type="date"
            defaultValue={(p.expected_delivery as string) ?? ""}
            disabled={readOnly}
            onBlur={(e) => update.mutate({ expected_delivery: e.target.value || null })}
          />
        </Field>
        <Field label="Situação">
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={p.status as string}
            disabled={!canWrite}
            onChange={(e) => update.mutate({ status: e.target.value })}
          >
            {STATUS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Origem">
          <Input
            defaultValue={(p.origin as string) ?? ""}
            disabled={readOnly}
            onBlur={(e) => update.mutate({ origin: e.target.value || null })}
          />
        </Field>
        <Field label="Próxima ação">
          <Input
            defaultValue={(p.next_action as string) ?? ""}
            disabled={readOnly}
            onBlur={(e) => update.mutate({ next_action: e.target.value || null })}
          />
        </Field>
        <Field label="Motivo da perda">
          <Input
            defaultValue={(p.loss_reason as string) ?? ""}
            disabled={readOnly}
            onBlur={(e) => update.mutate({ loss_reason: e.target.value || null })}
          />
        </Field>
        <Field label="Observações" className="sm:col-span-3">
          <Textarea
            defaultValue={(p.notes as string) ?? ""}
            disabled={readOnly}
            onBlur={(e) => update.mutate({ notes: e.target.value || null })}
          />
        </Field>
      </div>

      <h2 className="mt-6 mb-3 text-lg font-semibold">Itens sugeridos</h2>
      {orgId && (
        <ItemsEditor
          kind="presale"
          parentId={id}
          orgId={orgId}
          readOnly={readOnly}
          customerPriceListId={customer?.price_list_id ?? null}
        />
      )}
    </div>
  );
}
