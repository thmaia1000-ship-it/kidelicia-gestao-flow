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
import { brl } from "@/lib/fmt";
import { canWriteCommercial, useMembership } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/orcamentos/$id")({
  head: () => ({
    meta: [
      { title: "Orçamento — Ki Delícia Gestão" },
      {
        name: "description",
        content: "Detalhe do orçamento com itens, totais e conversão única em pedido.",
      },
      { property: "og:title", content: "Orçamento — Ki Delícia Gestão" },
      { property: "og:description", content: "Itens, totais e conversão única em pedido." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrcamentoDetalhe,
});

function OrcamentoDetalhe() {
  const { id } = Route.useParams();
  const { data: membership } = useMembership();
  const orgId = membership?.organization?.id;
  const canWrite = canWriteCommercial(membership?.roles ?? []);
  const navigate = useNavigate();

  const quote = useQuery({
    queryKey: ["quote", "one", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("*, customers(legal_name, trade_name, price_list_id, payment_terms)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Record<string, unknown>;
    },
  });

  const issuers = useQuery({
    queryKey: ["issuers", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("issuers")
        .select("id, legal_name, trade_name")
        .eq("organization_id", orgId!);
      return data ?? [];
    },
  });

  const update = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const { error } = await supabase.from("quotes").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Orçamento salvo.");
      quote.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const convert = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("convert_quote_to_order", { _quote_id: id });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (orderId) => {
      toast.success("Pedido vinculado ao orçamento (conversão única).");
      navigate({ to: "/pedidos/$id", params: { id: orderId } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (quote.isLoading || !quote.data) return <p className="text-muted-foreground">Carregando...</p>;
  const q = quote.data;
  const customer = q.customers as { trade_name?: string; legal_name?: string; price_list_id?: string } | null;
  const editable = canWrite && q.status === "rascunho";

  return (
    <div>
      <PageHeader
        title={`Orçamento nº ${q.number}`}
        description={`Cliente: ${customer?.trade_name || customer?.legal_name || "—"} · Situação: ${q.status} · Total ${brl(q.total as number)}`}
        actions={
          <>
            <Link to="/orcamentos" className="self-center text-sm underline">
              Voltar
            </Link>
            {canWrite && q.status === "rascunho" && (
              <Button variant="outline" onClick={() => update.mutate({ status: "enviado", sent_at: new Date().toISOString() })}>
                Marcar como enviado
              </Button>
            )}
            {canWrite && (q.status === "rascunho" || q.status === "enviado") && (
              <Button
                onClick={() => update.mutate({ status: "aprovado", approved_at: new Date().toISOString() })}
              >
                Registrar aprovação
              </Button>
            )}
            {canWrite && q.status === "aprovado" && (
              <Button onClick={() => convert.mutate()} disabled={convert.isPending}>
                {convert.isPending ? "Convertendo..." : "Converter em pedido"}
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-3">
        <Field label="Emitente proposto">
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={(q.issuer_id as string) ?? ""}
            disabled={!editable}
            onChange={(e) => update.mutate({ issuer_id: e.target.value || null })}
          >
            <option value="">Não definido — conferir “FATURADO POR”</option>
            {(issuers.data ?? []).map((i) => (
              <option key={i.id} value={i.id}>
                {i.trade_name || i.legal_name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Validade">
          <Input
            type="date"
            defaultValue={(q.valid_until as string) ?? ""}
            disabled={!editable}
            onBlur={(e) => update.mutate({ valid_until: e.target.value || null })}
          />
        </Field>
        <Field label="Condição de pagamento">
          <Input
            defaultValue={(q.payment_terms as string) ?? ""}
            disabled={!editable}
            onBlur={(e) => update.mutate({ payment_terms: e.target.value || null })}
          />
        </Field>
        <Field label="Desconto (R$)">
          <Input
            type="number"
            step="0.01"
            min="0"
            defaultValue={String(q.discount ?? 0)}
            disabled={!editable}
            onBlur={(e) => update.mutate({ discount: Number(e.target.value) || 0 })}
          />
        </Field>
        <Field label="Frete (R$)">
          <Input
            type="number"
            step="0.01"
            min="0"
            defaultValue={String(q.freight ?? 0)}
            disabled={!editable}
            onBlur={(e) => update.mutate({ freight: Number(e.target.value) || 0 })}
          />
        </Field>
        <Field label="Acréscimos (R$)">
          <Input
            type="number"
            step="0.01"
            min="0"
            defaultValue={String(q.additions ?? 0)}
            disabled={!editable}
            onBlur={(e) => update.mutate({ additions: Number(e.target.value) || 0 })}
          />
        </Field>
        <Field label="Prazo de entrega / condições" className="sm:col-span-3">
          <Textarea
            defaultValue={(q.delivery_terms as string) ?? ""}
            disabled={!editable}
            onBlur={(e) => update.mutate({ delivery_terms: e.target.value || null })}
          />
        </Field>
      </div>

      <div className="mt-4 rounded-lg border bg-card p-4 text-sm">
        <p>
          Itens {brl(q.items_total as number)} − desconto {brl(q.discount as number)} + frete{" "}
          {brl(q.freight as number)} + acréscimos {brl(q.additions as number)} ={" "}
          <strong>{brl(q.total as number)}</strong>
        </p>
      </div>

      <h2 className="mt-6 mb-3 text-lg font-semibold">Itens</h2>
      {orgId && (
        <ItemsEditor
          kind="quote"
          parentId={id}
          orgId={orgId}
          readOnly={!editable}
          customerPriceListId={customer?.price_list_id ?? null}
        />
      )}
      {!editable && (
        <p className="mt-3 text-sm text-muted-foreground">
          Orçamento fora do rascunho: itens congelados. Para alterar, registre uma nova revisão.
        </p>
      )}
    </div>
  );
}
