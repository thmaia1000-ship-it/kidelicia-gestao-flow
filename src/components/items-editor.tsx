import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { brl, qty, round2 } from "@/lib/fmt";

export type ParentKind = "presale" | "quote" | "order";

const TABLES = {
  presale: { table: "presale_items", fk: "presale_id" },
  quote: { table: "quote_items", fk: "quote_id" },
  order: { table: "sales_order_items", fk: "sales_order_id" },
} as const;

type ItemRow = {
  id: string;
  product_id: string;
  presentation_id: string | null;
  description_snapshot: string;
  commercial_unit: string;
  qty_commercial: number;
  factor_to_base: number;
  qty_base: number;
  unit_price: number;
  discount: number;
  subtotal: number;
  price_source: string | null;
};

export function useProductsCatalog(orgId: string | undefined) {
  return useQuery({
    queryKey: ["catalogo", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const [{ data: products, error }, { data: presentations }, { data: priceItems }] =
        await Promise.all([
          supabase
            .from("products")
            .select("*")
            .eq("organization_id", orgId!)
            .order("description"),
          supabase.from("product_presentations").select("*").eq("organization_id", orgId!),
          supabase
            .from("price_list_items")
            .select("*, price_lists(id, name, kind, active, valid_from, valid_to)")
            .eq("organization_id", orgId!),
        ]);
      if (error) throw error;
      return {
        products: products ?? [],
        presentations: presentations ?? [],
        priceItems: priceItems ?? [],
      };
    },
  });
}

export function ItemsEditor({
  kind,
  parentId,
  orgId,
  readOnly,
  customerPriceListId,
}: {
  kind: ParentKind;
  parentId: string;
  orgId: string;
  readOnly?: boolean;
  customerPriceListId?: string | null;
}) {
  const { table, fk } = TABLES[kind];
  const queryClient = useQueryClient();
  const catalog = useProductsCatalog(orgId);

  const itemsQuery = useQuery({
    queryKey: ["items", table, parentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq(fk, parentId)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as ItemRow[];
    },
  });

  const [productId, setProductId] = useState("");
  const [presentationId, setPresentationId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("");
  const [discount, setDiscount] = useState("0");
  const [priceSource, setPriceSource] = useState("manual");

  const products = catalog.data?.products ?? [];
  const product = products.find((p) => p.id === productId);
  const presentations = (catalog.data?.presentations ?? []).filter(
    (p) => p.product_id === productId,
  );
  const presentation = presentations.find((p) => p.id === presentationId);

  const factor = presentation ? Number(presentation.factor_to_base) : 1;
  const commercialUnit = presentation
    ? presentation.commercial_unit
    : (product?.commercial_unit ?? "UN");
  const divisible = presentation ? presentation.divisible : (product?.divisible ?? false);
  const qtyBase = round2(Number(quantity || 0) * factor);
  const fractionInvalid =
    !divisible && Number(quantity || 0) > 0 && Math.abs(qtyBase - Math.trunc(qtyBase)) > 1e-9;

  function resolvePrice(pid: string, presId: string) {
    const rows = (catalog.data?.priceItems ?? []).filter(
      (r) =>
        r.product_id === pid &&
        (presId ? r.presentation_id === presId : r.presentation_id === null),
    );
    const today = new Date().toISOString().slice(0, 10);
    const valid = rows.filter((r) => {
      const l = r.price_lists as unknown as {
        active: boolean;
        valid_from: string | null;
        valid_to: string | null;
        kind: string;
      } | null;
      if (!l || !l.active) return false;
      if (l.valid_from && l.valid_from > today) return false;
      if (l.valid_to && l.valid_to < today) return false;
      return true;
    });
    const fromCustomer = customerPriceListId
      ? valid.find((r) => r.price_list_id === customerPriceListId)
      : undefined;
    if (fromCustomer) return { price: Number(fromCustomer.unit_price), source: "tabela_cliente" };
    const general = valid.find(
      (r) => (r.price_lists as unknown as { kind: string } | null)?.kind === "geral",
    );
    if (general) return { price: Number(general.unit_price), source: "tabela_geral" };
    return null;
  }

  function onPickProduct(pid: string) {
    setProductId(pid);
    setPresentationId("");
    const resolved = resolvePrice(pid, "");
    setPrice(resolved ? String(resolved.price) : "");
    setPriceSource(resolved ? resolved.source : "manual");
  }

  function onPickPresentation(presId: string) {
    setPresentationId(presId);
    const resolved = resolvePrice(productId, presId);
    setPrice(resolved ? String(resolved.price) : "");
    setPriceSource(resolved ? resolved.source : "manual");
  }

  const addItem = useMutation({
    mutationFn: async () => {
      if (!product) throw new Error("Selecione um produto.");
      if (presentation && !presentation.approved) {
        throw new Error(
          "Esta apresentação ainda não foi aprovada. Aprove a conversão em Produtos antes de vender nesta embalagem.",
        );
      }
      if (fractionInvalid) {
        throw new Error(
          `Fracionamento incompatível: ${quantity} × ${factor} = ${qtyBase} unidades base. Marque o produto/apresentação como divisível ou ajuste a quantidade.`,
        );
      }
      const payload = {
        organization_id: orgId,
        [fk]: parentId,
        product_id: product.id,
        presentation_id: presentation?.id ?? null,
        description_snapshot: `${product.description}${presentation ? ` — ${presentation.label}` : ""}`,
        commercial_unit: commercialUnit,
        qty_commercial: Number(quantity),
        factor_to_base: factor,
        qty_base: qtyBase,
        unit_price: round2(Number(price || 0)),
        discount: round2(Number(discount || 0)),
        ...(kind === "presale" ? {} : { price_source: priceSource }),
      };
      const { error } = await supabase.from(table).insert(payload as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item adicionado.");
      setProductId("");
      setPresentationId("");
      setQuantity("1");
      setPrice("");
      setDiscount("0");
      itemsQuery.refetch();
      queryClient.invalidateQueries({ queryKey: [kind] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item removido.");
      itemsQuery.refetch();
      queryClient.invalidateQueries({ queryKey: [kind] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const items = itemsQuery.data ?? [];
  const totals = useMemo(
    () => ({
      subtotal: items.reduce((a, i) => a + Number(i.subtotal), 0),
      base: items.reduce((a, i) => a + Number(i.qty_base), 0),
    }),
    [items],
  );

  const previewSubtotal = round2(Number(quantity || 0) * Number(price || 0) - Number(discount || 0));

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="rounded-lg border bg-card p-4">
          <p className="mb-3 text-sm font-semibold">Adicionar item</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <div className="space-y-1.5 lg:col-span-2">
              <Label>Produto</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={productId}
                onChange={(e) => onPickProduct(e.target.value)}
              >
                <option value="">Selecione...</option>
                {products
                  .filter((p) => p.active)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} — {p.description}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Embalagem</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={presentationId}
                onChange={(e) => onPickPresentation(e.target.value)}
                disabled={!productId}
              >
                <option value="">{product?.commercial_unit ?? "UN"} (unidade base)</option>
                {presentations.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label} ({p.factor_to_base} {product?.base_unit})
                    {p.approved ? "" : " — não aprovada"}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Quantidade ({commercialUnit})</Label>
              <Input
                type="number"
                step="0.0001"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Preço por {commercialUnit}</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  setPriceSource("negociado");
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Desconto (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground">
              Fator {qty(factor)} · {qty(Number(quantity || 0))} {commercialUnit} ={" "}
              <strong>
                {qty(qtyBase)} {product?.base_unit ?? "UN"}
              </strong>{" "}
              · Subtotal <strong>{brl(previewSubtotal)}</strong> · Origem do preço: {priceSource}
            </p>
            <Button
              onClick={() => addItem.mutate()}
              disabled={!productId || addItem.isPending || fractionInvalid}
            >
              {addItem.isPending ? "Adicionando..." : "Adicionar item"}
            </Button>
          </div>
          {fractionInvalid && (
            <p className="mt-2 text-sm text-destructive">
              Fracionamento incompatível: resultaria em {qty(qtyBase)} unidades base.
            </p>
          )}
          {presentation && !presentation.approved && (
            <p className="mt-2 text-sm text-destructive">
              Apresentação sem conversão aprovada — aprove em Produtos e preços.
            </p>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-secondary/70">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Item</th>
              <th className="px-3 py-2 text-right font-semibold">Qtd. comercial</th>
              <th className="px-3 py-2 text-right font-semibold">Fator</th>
              <th className="px-3 py-2 text-right font-semibold">Qtd. base</th>
              <th className="px-3 py-2 text-right font-semibold">Preço</th>
              <th className="px-3 py-2 text-right font-semibold">Desc.</th>
              <th className="px-3 py-2 text-right font-semibold">Subtotal</th>
              {!readOnly && <th className="w-10" />}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                  Nenhum item lançado.
                </td>
              </tr>
            )}
            {items.map((i) => (
              <tr key={i.id} className="border-t">
                <td className="px-3 py-2">{i.description_snapshot}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {qty(i.qty_commercial)} {i.commercial_unit}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{qty(i.factor_to_base)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{qty(i.qty_base)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{brl(i.unit_price)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{brl(i.discount)}</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">
                  {brl(i.subtotal)}
                </td>
                {!readOnly && (
                  <td className="px-2 py-2 text-right">
                    <button
                      onClick={() => removeItem.mutate(i.id)}
                      aria-label="Remover item"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 bg-secondary/50 font-semibold">
            <tr>
              <td className="px-3 py-2">Total dos itens</td>
              <td />
              <td />
              <td className="px-3 py-2 text-right tabular-nums">{qty(totals.base)}</td>
              <td />
              <td />
              <td className="px-3 py-2 text-right tabular-nums">{brl(totals.subtotal)}</td>
              {!readOnly && <td />}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
