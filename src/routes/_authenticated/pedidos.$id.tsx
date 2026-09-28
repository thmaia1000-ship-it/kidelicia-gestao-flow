import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { ItemsEditor } from "@/components/items-editor";
import { PageHeader } from "@/components/page-header";
import { Field } from "@/routes/_authenticated/clientes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { brl, dateBR } from "@/lib/fmt";
import { canWriteCommercial, useMembership } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/pedidos/$id")({
  head: () => ({
    meta: [
      { title: "Pedido — Ki Delícia Gestão" },
      { name: "description", content: "Detalhe do pedido com itens, referências legadas e totais." },
      { property: "og:title", content: "Pedido — Ki Delícia Gestão" },
      { property: "og:description", content: "Itens, referências legadas e totais do pedido." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PedidoDetalhe,
});

function PedidoDetalhe() {
  const { id } = Route.useParams();
  const { data: membership } = useMembership();
  const orgId = membership?.organization?.id;
  const canWrite = canWriteCommercial(membership?.roles ?? []);

  const order = useQuery({
    queryKey: ["order", "one", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_orders")
        .select("*, customers(legal_name, trade_name, price_list_id)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Record<string, unknown>;
    },
  });

  const update = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const { error } = await supabase.from("sales_orders").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pedido salvo.");
      order.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (order.isLoading || !order.data) return <p className="text-muted-foreground">Carregando...</p>;
  const o = order.data;
  const customer = o.customers as { trade_name?: string; legal_name?: string; price_list_id?: string } | null;
  const snapshot = (o.customer_snapshot ?? {}) as Record<string, unknown>;
  const editable = canWrite && o.status === "rascunho";

  return (
    <div>
      <PageHeader
        title={`Pedido nº ${o.number}`}
        description={`Cliente: ${customer?.trade_name || customer?.legal_name || "—"} · ${dateBR(o.order_date as string)} · Total ${brl(o.total as number)}`}
        actions={
          <Link to="/pedidos" className="self-center text-sm underline">
            Voltar
          </Link>
        }
      />

      <div className="mb-4 rounded-lg border border-accent bg-accent/20 p-4 text-sm">
        <p className="font-semibold">Confirmação operacional bloqueada nesta fase</p>
        <p className="mt-1 text-muted-foreground">
          Confirmar o pedido precisa gerar reserva de estoque e títulos a receber em uma única
          operação atômica. Esses módulos entram na Fase 3, por isso o pedido permanece em rascunho —
          nenhum botão de sucesso fictício é oferecido.
        </p>
        <Button className="mt-3" disabled>
          Confirmar pedido (Fase 3)
        </Button>
      </div>

      <div className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-3">
        <Field label="Data do pedido">
          <Input
            type="date"
            defaultValue={(o.order_date as string) ?? ""}
            disabled={!editable}
            onBlur={(e) => update.mutate({ order_date: e.target.value })}
          />
        </Field>
        <Field label="Entrega prevista">
          <Input
            type="date"
            defaultValue={(o.delivery_date as string) ?? ""}
            disabled={!editable}
            onBlur={(e) => update.mutate({ delivery_date: e.target.value || null })}
          />
        </Field>
        <Field label="Vencimento informado">
          <Input
            type="date"
            defaultValue={(o.due_date as string) ?? ""}
            disabled={!editable}
            onBlur={(e) => update.mutate({ due_date: e.target.value || null })}
          />
        </Field>
        <Field label="Ref. legada de VENDA">
          <Input
            defaultValue={(o.legacy_sale_ref as string) ?? ""}
            disabled={!editable}
            onBlur={(e) => update.mutate({ legacy_sale_ref: e.target.value || null })}
          />
        </Field>
        <Field label="Ref. legada de PEDIDO">
          <Input
            defaultValue={(o.legacy_order_ref as string) ?? ""}
            disabled={!editable}
            onBlur={(e) => update.mutate({ legacy_order_ref: e.target.value || null })}
          />
        </Field>
        <Field label="Condição de pagamento">
          <Input
            defaultValue={(o.payment_terms as string) ?? ""}
            disabled={!editable}
            onBlur={(e) => update.mutate({ payment_terms: e.target.value || null })}
          />
        </Field>
        <Field label="Desconto (R$)">
          <Input
            type="number"
            step="0.01"
            min="0"
            defaultValue={String(o.discount ?? 0)}
            disabled={!editable}
            onBlur={(e) => update.mutate({ discount: Number(e.target.value) || 0 })}
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
          />
        </Field>
        <Field label="Acréscimos (R$)">
          <Input
            type="number"
            step="0.01"
            min="0"
            defaultValue={String(o.additions ?? 0)}
            disabled={!editable}
            onBlur={(e) => update.mutate({ additions: Number(e.target.value) || 0 })}
          />
        </Field>
        <Field label="Observações" className="sm:col-span-3">
          <Textarea
            defaultValue={(o.notes as string) ?? ""}
            disabled={!editable}
            onBlur={(e) => update.mutate({ notes: e.target.value || null })}
          />
        </Field>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        {[
          { l: "Situação comercial", v: String(o.status) },
          { l: "Produção", v: String(o.production_status) },
          { l: "Expedição", v: String(o.shipping_status) },
          { l: "Financeiro", v: String(o.financial_status) },
        ].map((s) => (
          <div key={s.l} className="rounded-lg border bg-card p-3">
            <p className="text-xs uppercase text-muted-foreground">{s.l}</p>
            <p className="font-semibold">{s.v}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border bg-card p-4 text-sm">
        <p className="font-semibold">Cópia histórica do cliente no pedido</p>
        <p className="mt-1 text-muted-foreground">
          {(snapshot.legal_name as string) || "—"}
          {snapshot.document ? ` · ${snapshot.document}` : ""}
          {(snapshot.address as { city?: string })?.city
            ? ` · ${(snapshot.address as { city?: string }).city}`
            : ""}
        </p>
      </div>

      <h2 className="mt-6 mb-3 text-lg font-semibold">Itens</h2>
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
  );
}
