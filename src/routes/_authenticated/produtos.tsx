import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { DataTable, type Column } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { Field } from "@/routes/_authenticated/clientes";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { brl, dateBR, qty } from "@/lib/fmt";
import { canWriteCommercial, useMembership } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/produtos")({
  head: () => ({
    meta: [
      { title: "Produtos e preços — Ki Delícia Gestão" },
      {
        name: "description",
        content:
          "Catálogo de biscoitos, polvilhos, broas, empadas e chips com unidade de estoque, apresentações comerciais e tabelas de preço vigentes.",
      },
      { property: "og:title", content: "Produtos e preços — Ki Delícia Gestão" },
      {
        property: "og:description",
        content: "Catálogo, apresentações com conversão aprovada e tabelas de preço.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Produtos,
});

type Product = {
  id: string;
  sku: string;
  legacy_code: string | null;
  description: string;
  raw_description: string | null;
  category: string | null;
  flavor: string | null;
  presentation_raw: string | null;
  base_unit: string;
  commercial_unit: string;
  units_per_package: number;
  divisible: boolean;
  net_weight: number | null;
  weight_unit: string | null;
  ean: string | null;
  ncm: string | null;
  kind: "fabricado" | "revendido" | "material";
  track_lot: boolean;
  min_stock: number;
  active: boolean;
  notes: string | null;
};

const EMPTY: Product = {
  id: "",
  sku: "",
  legacy_code: "",
  description: "",
  raw_description: "",
  category: "",
  flavor: "",
  presentation_raw: "",
  base_unit: "UN",
  commercial_unit: "UN",
  units_per_package: 1,
  divisible: false,
  net_weight: null,
  weight_unit: "g",
  ean: "",
  ncm: "",
  kind: "fabricado",
  track_lot: false,
  min_stock: 0,
  active: true,
  notes: "",
};

function Produtos() {
  const { data: membership } = useMembership();
  const orgId = membership?.organization?.id;
  const canWrite = canWriteCommercial(membership?.roles ?? []);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Product>(EMPTY);

  const products = useQuery({
    queryKey: ["products", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("organization_id", orgId!)
        .order("description");
      if (error) throw error;
      return (data ?? []) as unknown as Product[];
    },
  });

  const presentations = useQuery({
    queryKey: ["presentations", form.id],
    enabled: !!form.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_presentations")
        .select("*")
        .eq("product_id", form.id)
        .order("label");
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.sku.trim()) throw new Error("Informe o SKU interno.");
      if (!form.description.trim()) throw new Error("Informe a descrição.");
      const payload = {
        organization_id: orgId,
        sku: form.sku.trim(),
        legacy_code: form.legacy_code || null,
        description: form.description.trim(),
        raw_description: form.raw_description || form.description.trim(),
        category: form.category || null,
        flavor: form.flavor || null,
        presentation_raw: form.presentation_raw || null,
        base_unit: form.base_unit || "UN",
        commercial_unit: form.commercial_unit || "UN",
        units_per_package: Number(form.units_per_package) || 1,
        divisible: form.divisible,
        net_weight:
          form.net_weight === null || form.net_weight === undefined
            ? null
            : Number(form.net_weight),
        weight_unit: form.weight_unit || null,
        ean: form.ean || null,
        ncm: form.ncm || null,
        kind: form.kind,
        track_lot: form.track_lot,
        min_stock: Number(form.min_stock) || 0,
        active: form.active,
        notes: form.notes || null,
      };
      if (form.id) {
        const { error } = await supabase
          .from("products")
          .update(payload as never)
          .eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      toast.success("Produto salvo.");
      await products.refetch();
      setOpen(false);
      setForm(EMPTY);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [pres, setPres] = useState({ label: "", unit: "FARDO", factor: "40", divisible: false });
  const addPresentation = useMutation({
    mutationFn: async () => {
      if (!pres.label.trim()) throw new Error("Informe o rótulo da apresentação.");
      if (!(Number(pres.factor) > 0)) throw new Error("Informe o fator de conversão.");
      const { error } = await supabase.from("product_presentations").insert({
        organization_id: orgId,
        product_id: form.id,
        label: pres.label.trim(),
        commercial_unit: pres.unit,
        factor_to_base: Number(pres.factor),
        divisible: pres.divisible,
        approved: false,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Apresentação criada como não aprovada. Aprove para liberar a venda.");
      setPres({ label: "", unit: "FARDO", factor: "40", divisible: false });
      presentations.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approvePresentation = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const { error } = await supabase
        .from("product_presentations")
        .update({ approved } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Conversão atualizada.");
      presentations.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const columns: Column<Product>[] = [
    { key: "sku", header: "SKU" },
    { key: "legacy_code", header: "Cód. legado", render: (r) => r.legacy_code || "—" },
    { key: "description", header: "Descrição" },
    { key: "category", header: "Categoria" },
    { key: "kind", header: "Tipo", render: (r) => r.kind },
    { key: "base_unit", header: "Un. estoque" },
    { key: "ean", header: "EAN", render: (r) => r.ean || "—" },
    {
      key: "active",
      header: "Situação",
      value: (r) => (r.active ? "Ativo" : "Inativo"),
      render: (r) => (r.active ? "Ativo" : "Inativo"),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Produtos e preços"
        description="Unidade comercial e unidade de estoque são separadas. Códigos legados e EANs ficam conservados, sem servir de chave nem fundir produtos."
        actions={
          canWrite ? (
            <Button
              onClick={() => {
                setForm(EMPTY);
                setOpen(true);
              }}
            >
              <Plus className="size-4" /> Novo produto
            </Button>
          ) : null
        }
      />

      <Tabs defaultValue="produtos">
        <TabsList>
          <TabsTrigger value="produtos">Catálogo</TabsTrigger>
          <TabsTrigger value="precos">Tabelas de preço</TabsTrigger>
        </TabsList>

        <TabsContent value="produtos" className="mt-4">
          <DataTable
            columns={columns}
            rows={products.data ?? []}
            rowKey={(r) => r.id}
            loading={products.isLoading}
            searchPlaceholder="Buscar por descrição, SKU, EAN, código legado..."
            onRowClick={(r) => {
              setForm(r);
              setOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value="precos" className="mt-4">
          <PriceLists orgId={orgId} canWrite={canWrite} products={products.data ?? []} />
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar produto" : "Novo produto"}</DialogTitle>
            <DialogDescription>
              Descrição e embalagem brutas das planilhas são preservadas em campos próprios.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="SKU interno *">
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </Field>
            <Field label="Código legado (não é chave)">
              <Input
                value={form.legacy_code ?? ""}
                onChange={(e) => setForm({ ...form, legacy_code: e.target.value })}
              />
            </Field>
            <Field label="Descrição *" className="sm:col-span-2">
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>
            <Field label="Descrição bruta da origem" className="sm:col-span-2">
              <Input
                value={form.raw_description ?? ""}
                onChange={(e) => setForm({ ...form, raw_description: e.target.value })}
              />
            </Field>
            <Field label="Categoria">
              <Input
                value={form.category ?? ""}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Biscoito, polvilho, broa, chips..."
              />
            </Field>
            <Field label="Sabor">
              <Input
                value={form.flavor ?? ""}
                onChange={(e) => setForm({ ...form, flavor: e.target.value })}
              />
            </Field>
            <Field label="Embalagem bruta da origem">
              <Input
                value={form.presentation_raw ?? ""}
                onChange={(e) => setForm({ ...form, presentation_raw: e.target.value })}
                placeholder="1X40X35GR"
              />
            </Field>
            <Field label="Tipo">
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value as Product["kind"] })}
              >
                <option value="fabricado">Fabricado</option>
                <option value="revendido">Revendido</option>
                <option value="material">Material / insumo</option>
              </select>
            </Field>
            <Field label="Unidade de estoque (base)">
              <Input
                value={form.base_unit}
                onChange={(e) => setForm({ ...form, base_unit: e.target.value })}
              />
            </Field>
            <Field label="Unidade comercial padrão">
              <Input
                value={form.commercial_unit}
                onChange={(e) => setForm({ ...form, commercial_unit: e.target.value })}
              />
            </Field>
            <Field label="Peso líquido">
              <Input
                type="number"
                step="0.001"
                value={form.net_weight ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    net_weight: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="Unidade de peso">
              <Input
                value={form.weight_unit ?? ""}
                onChange={(e) => setForm({ ...form, weight_unit: e.target.value })}
              />
            </Field>
            <Field label="EAN (texto)">
              <Input
                value={form.ean ?? ""}
                onChange={(e) => setForm({ ...form, ean: e.target.value })}
              />
            </Field>
            <Field label="NCM (texto)">
              <Input
                value={form.ncm ?? ""}
                onChange={(e) => setForm({ ...form, ncm: e.target.value })}
              />
            </Field>
            <Field label="Estoque mínimo">
              <Input
                type="number"
                step="0.0001"
                value={form.min_stock}
                onChange={(e) => setForm({ ...form, min_stock: Number(e.target.value) })}
              />
            </Field>
            <Field label="Observações" className="sm:col-span-2">
              <Textarea
                value={form.notes ?? ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.divisible}
                onCheckedChange={(v) => setForm({ ...form, divisible: !!v })}
              />
              Permite quantidade fracionada na unidade base
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.track_lot}
                onCheckedChange={(v) => setForm({ ...form, track_lot: !!v })}
              />
              Controla lote e validade
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.active}
                onCheckedChange={(v) => setForm({ ...form, active: !!v })}
              />
              Produto ativo
            </label>
          </div>

          {form.id && (
            <div className="mt-2 rounded-lg border p-3">
              <p className="text-sm font-semibold">Apresentações comerciais</p>
              <p className="text-xs text-muted-foreground">
                A conversão precisa de aprovação explícita antes de ser usada em vendas.
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {(presentations.data ?? []).length === 0 && (
                  <li className="text-muted-foreground">Nenhuma apresentação cadastrada.</li>
                )}
                {(presentations.data ?? []).map((p) => (
                  <li key={p.id as string} className="flex items-center justify-between gap-2">
                    <span>
                      {p.label as string} — 1 {p.commercial_unit as string} ={" "}
                      {qty(p.factor_to_base as number)} {form.base_unit}
                      {(p.divisible as boolean) ? " (fracionável)" : ""}
                    </span>
                    <Button
                      size="sm"
                      variant={(p.approved as boolean) ? "outline" : "default"}
                      onClick={() =>
                        approvePresentation.mutate({
                          id: p.id as string,
                          approved: !(p.approved as boolean),
                        })
                      }
                    >
                      {(p.approved as boolean) ? "Aprovada — revogar" : "Aprovar conversão"}
                    </Button>
                  </li>
                ))}
              </ul>
              {canWrite && (
                <div className="mt-3 grid gap-2 sm:grid-cols-4">
                  <Input
                    placeholder="Rótulo (Fardo 40 un.)"
                    value={pres.label}
                    onChange={(e) => setPres({ ...pres, label: e.target.value })}
                  />
                  <Input
                    placeholder="Unidade"
                    value={pres.unit}
                    onChange={(e) => setPres({ ...pres, unit: e.target.value })}
                  />
                  <Input
                    type="number"
                    step="0.0001"
                    placeholder="Fator"
                    value={pres.factor}
                    onChange={(e) => setPres({ ...pres, factor: e.target.value })}
                  />
                  <Button variant="outline" onClick={() => addPresentation.mutate()}>
                    Adicionar
                  </Button>
                  <label className="flex items-center gap-2 text-sm sm:col-span-4">
                    <Checkbox
                      checked={pres.divisible}
                      onCheckedChange={(v) => setPres({ ...pres, divisible: !!v })}
                    />
                    Permite fração desta embalagem (ex.: 1,5 fardo)
                  </label>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => save.mutate()} disabled={!canWrite || save.isPending}>
              {save.isPending ? "Salvando..." : "Salvar produto"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PriceLists({
  orgId,
  canWrite,
  products,
}: {
  orgId: string | undefined;
  canWrite: boolean;
  products: Product[];
}) {
  const [selected, setSelected] = useState<string>("");
  const [newList, setNewList] = useState({ name: "", kind: "geral", from: "", to: "" });
  const [item, setItem] = useState({ productId: "", presentationId: "", price: "", unit: "UN" });

  const lists = useQuery({
    queryKey: ["price_lists", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("price_lists")
        .select("*")
        .eq("organization_id", orgId!)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const presentations = useQuery({
    queryKey: ["all_presentations", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("product_presentations")
        .select("*")
        .eq("organization_id", orgId!);
      return data ?? [];
    },
  });

  const items = useQuery({
    queryKey: ["price_items", selected],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("price_list_items")
        .select("*, products(description, sku), product_presentations(label)")
        .eq("price_list_id", selected);
      if (error) throw error;
      return data ?? [];
    },
  });

  const createList = useMutation({
    mutationFn: async () => {
      if (!newList.name.trim()) throw new Error("Informe o nome da tabela.");
      const { error } = await supabase.from("price_lists").insert({
        organization_id: orgId,
        name: newList.name.trim(),
        kind: newList.kind,
        valid_from: newList.from || null,
        valid_to: newList.to || null,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tabela criada.");
      setNewList({ name: "", kind: "geral", from: "", to: "" });
      lists.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addItem = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Selecione uma tabela.");
      if (!item.productId) throw new Error("Selecione um produto.");
      if (!(Number(item.price) >= 0)) throw new Error("Informe o preço.");
      const { error } = await supabase.from("price_list_items").insert({
        organization_id: orgId,
        price_list_id: selected,
        product_id: item.productId,
        presentation_id: item.presentationId || null,
        unit_price: Number(item.price),
        price_unit: item.unit,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Preço registrado.");
      setItem({ productId: "", presentationId: "", price: "", unit: "UN" });
      items.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const productPresentations = (presentations.data ?? []).filter(
    (p) => p.product_id === item.productId,
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm font-semibold">Prioridade de preço aplicada nos itens</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Preço negociado no item &gt; tabela vigente do cliente &gt; tabela geral vigente. O preço
          e o fator ficam gravados no item; mudanças futuras no catálogo não recalculam pedidos
          confirmados.
        </p>
      </div>

      {canWrite && (
        <div className="grid gap-2 rounded-lg border bg-card p-4 sm:grid-cols-5">
          <Input
            placeholder="Nome da tabela"
            value={newList.name}
            onChange={(e) => setNewList({ ...newList, name: e.target.value })}
          />
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={newList.kind}
            onChange={(e) => setNewList({ ...newList, kind: e.target.value })}
          >
            <option value="geral">Geral</option>
            <option value="cliente">Cliente</option>
            <option value="canal">Canal/vendedor</option>
          </select>
          <Input
            type="date"
            value={newList.from}
            onChange={(e) => setNewList({ ...newList, from: e.target.value })}
          />
          <Input
            type="date"
            value={newList.to}
            onChange={(e) => setNewList({ ...newList, to: e.target.value })}
          />
          <Button variant="outline" onClick={() => createList.mutate()}>
            Criar tabela
          </Button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="rounded-lg border bg-card p-3">
          <p className="mb-2 text-sm font-semibold">Tabelas</p>
          <ul className="space-y-1 text-sm">
            {(lists.data ?? []).length === 0 && (
              <li className="text-muted-foreground">Nenhuma tabela criada.</li>
            )}
            {(lists.data ?? []).map((l) => (
              <li key={l.id as string}>
                <button
                  className={`w-full rounded px-2 py-1 text-left ${selected === l.id ? "bg-secondary font-semibold" : "hover:bg-secondary/50"}`}
                  onClick={() => setSelected(l.id as string)}
                >
                  {l.name as string}{" "}
                  <span className="text-xs text-muted-foreground">
                    ({l.kind as string}
                    {l.valid_from ? ` · desde ${dateBR(l.valid_from as string)}` : ""})
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          {canWrite && selected && (
            <div className="grid gap-2 rounded-lg border bg-card p-3 sm:grid-cols-5">
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm sm:col-span-2"
                value={item.productId}
                onChange={(e) =>
                  setItem({ ...item, productId: e.target.value, presentationId: "" })
                }
              >
                <option value="">Produto...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} — {p.description}
                  </option>
                ))}
              </select>
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={item.presentationId}
                onChange={(e) => setItem({ ...item, presentationId: e.target.value })}
              >
                <option value="">Unidade base</option>
                {productPresentations.map((p) => (
                  <option key={p.id as string} value={p.id as string}>
                    {p.label as string}
                  </option>
                ))}
              </select>
              <Input
                type="number"
                step="0.01"
                placeholder="Preço"
                value={item.price}
                onChange={(e) => setItem({ ...item, price: e.target.value })}
              />
              <Button variant="outline" onClick={() => addItem.mutate()}>
                Adicionar preço
              </Button>
            </div>
          )}

          <DataTable
            columns={[
              {
                key: "produto",
                header: "Produto",
                value: (r) => String((r.products as { description?: string })?.description ?? ""),
                render: (r) => String((r.products as { description?: string })?.description ?? "—"),
              },
              {
                key: "apresentacao",
                header: "Apresentação",
                value: (r) =>
                  String((r.product_presentations as { label?: string })?.label ?? "Unidade base"),
                render: (r) =>
                  String((r.product_presentations as { label?: string })?.label ?? "Unidade base"),
              },
              { key: "price_unit", header: "Unidade do preço" },
              {
                key: "unit_price",
                header: "Preço",
                align: "right",
                value: (r) => Number(r.unit_price),
                render: (r) => brl(r.unit_price as number),
              },
            ]}
            rows={(items.data ?? []) as Record<string, unknown>[]}
            rowKey={(r) => String(r.id)}
            loading={items.isFetching}
            emptyMessage={selected ? "Nenhum preço nesta tabela." : "Selecione uma tabela."}
          />
        </div>
      </div>
    </div>
  );
}
