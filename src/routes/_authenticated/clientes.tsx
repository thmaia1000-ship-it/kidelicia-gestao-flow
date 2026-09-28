import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { DataTable, type Column } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { onlyDigits } from "@/lib/fmt";
import { canWriteCommercial, useMembership } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes e lojas — Ki Delícia Gestão" },
      {
        name: "description",
        content:
          "Cadastro de clientes, filiais e lojas com documento textual, endereço estruturado e condição de pagamento.",
      },
      { property: "og:title", content: "Clientes e lojas — Ki Delícia Gestão" },
      { property: "og:description", content: "Cadastro de clientes e lojas da operação Ki Delícia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Clientes,
});

type Address = {
  street?: string;
  number?: string;
  district?: string;
  city?: string;
  state?: string;
  zip?: string;
};

type Customer = {
  id: string;
  legal_name: string;
  trade_name: string | null;
  document: string | null;
  state_registration: string | null;
  email: string | null;
  phone: string | null;
  address: Address;
  commercial_group: string | null;
  salesperson_id: string | null;
  payment_terms: string | null;
  price_list_id: string | null;
  notes: string | null;
  active: boolean;
};

const EMPTY: Customer = {
  id: "",
  legal_name: "",
  trade_name: "",
  document: "",
  state_registration: "",
  email: "",
  phone: "",
  address: {},
  commercial_group: "",
  salesperson_id: null,
  payment_terms: "",
  price_list_id: null,
  notes: "",
  active: true,
};

function Clientes() {
  const { data: membership } = useMembership();
  const orgId = membership?.organization?.id;
  const canWrite = canWriteCommercial(membership?.roles ?? []);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Customer>(EMPTY);

  const customers = useQuery({
    queryKey: ["customers", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("organization_id", orgId!)
        .order("legal_name");
      if (error) throw error;
      return (data ?? []) as unknown as Customer[];
    },
  });

  const aux = useQuery({
    queryKey: ["clientes-aux", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const [{ data: sp }, { data: pl }] = await Promise.all([
        supabase.from("salespeople").select("id, name").eq("organization_id", orgId!).order("name"),
        supabase.from("price_lists").select("id, name").eq("organization_id", orgId!).order("name"),
      ]);
      return { salespeople: sp ?? [], priceLists: pl ?? [] };
    },
  });

  const locations = useQuery({
    queryKey: ["locations", form.id],
    enabled: !!form.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_locations")
        .select("*")
        .eq("customer_id", form.id)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.legal_name.trim()) throw new Error("Informe a razão social.");
      const payload = {
        organization_id: orgId,
        legal_name: form.legal_name.trim(),
        trade_name: form.trade_name || null,
        document: form.document || null,
        state_registration: form.state_registration || null,
        email: form.email || null,
        phone: form.phone || null,
        address: form.address ?? {},
        commercial_group: form.commercial_group || null,
        salesperson_id: form.salesperson_id || null,
        payment_terms: form.payment_terms || null,
        price_list_id: form.price_list_id || null,
        notes: form.notes || null,
        active: form.active,
      };
      if (form.id) {
        const { error } = await supabase
          .from("customers")
          .update(payload as never)
          .eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("customers").insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      toast.success("Cliente salvo.");
      await customers.refetch();
      setOpen(false);
      setForm(EMPTY);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [locName, setLocName] = useState("");
  const [locCity, setLocCity] = useState("");
  const addLocation = useMutation({
    mutationFn: async () => {
      if (!locName.trim()) throw new Error("Informe o nome da loja/filial.");
      const { error } = await supabase.from("customer_locations").insert({
        organization_id: orgId,
        customer_id: form.id,
        name: locName.trim(),
        address: { city: locCity || undefined },
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Loja adicionada.");
      setLocName("");
      setLocCity("");
      locations.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const columns: Column<Customer>[] = [
    { key: "legal_name", header: "Razão social" },
    { key: "trade_name", header: "Nome fantasia" },
    { key: "document", header: "CNPJ/CPF", render: (r) => r.document || "—" },
    {
      key: "city",
      header: "Cidade",
      value: (r) => r.address?.city ?? "",
      render: (r) => r.address?.city || "—",
    },
    { key: "commercial_group", header: "Grupo" },
    { key: "payment_terms", header: "Condição" },
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
        title="Clientes e lojas"
        description="Documentos guardados como texto (zeros preservados) e endereço estruturado. O pedido guarda cópia histórica destes dados."
        actions={
          canWrite ? (
            <Button
              onClick={() => {
                setForm(EMPTY);
                setOpen(true);
              }}
            >
              <Plus className="size-4" /> Novo cliente
            </Button>
          ) : null
        }
      />

      <DataTable
        columns={columns}
        rows={customers.data ?? []}
        rowKey={(r) => r.id}
        loading={customers.isLoading}
        searchPlaceholder="Buscar por razão social, CNPJ, cidade..."
        onRowClick={(r) => {
          setForm({ ...r, address: r.address ?? {} });
          setOpen(true);
        }}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar cliente" : "Novo cliente"}</DialogTitle>
            <DialogDescription>
              Alterações no cadastro não mudam pedidos já registrados.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Razão social *" className="sm:col-span-2">
              <Input
                value={form.legal_name}
                onChange={(e) => setForm({ ...form, legal_name: e.target.value })}
              />
            </Field>
            <Field label="Nome fantasia">
              <Input
                value={form.trade_name ?? ""}
                onChange={(e) => setForm({ ...form, trade_name: e.target.value })}
              />
            </Field>
            <Field label="CNPJ/CPF (texto)">
              <Input
                value={form.document ?? ""}
                onChange={(e) => setForm({ ...form, document: e.target.value })}
              />
              {form.document ? (
                <p className="text-xs text-muted-foreground">
                  Normalizado: {onlyDigits(form.document) || "—"}
                </p>
              ) : null}
            </Field>
            <Field label="Inscrição estadual">
              <Input
                value={form.state_registration ?? ""}
                onChange={(e) => setForm({ ...form, state_registration: e.target.value })}
              />
            </Field>
            <Field label="Grupo comercial">
              <Input
                value={form.commercial_group ?? ""}
                onChange={(e) => setForm({ ...form, commercial_group: e.target.value })}
              />
            </Field>
            <Field label="E-mail">
              <Input
                value={form.email ?? ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Telefone">
              <Input
                value={form.phone ?? ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field label="Logradouro">
              <Input
                value={form.address?.street ?? ""}
                onChange={(e) =>
                  setForm({ ...form, address: { ...form.address, street: e.target.value } })
                }
              />
            </Field>
            <Field label="Número">
              <Input
                value={form.address?.number ?? ""}
                onChange={(e) =>
                  setForm({ ...form, address: { ...form.address, number: e.target.value } })
                }
              />
            </Field>
            <Field label="Bairro">
              <Input
                value={form.address?.district ?? ""}
                onChange={(e) =>
                  setForm({ ...form, address: { ...form.address, district: e.target.value } })
                }
              />
            </Field>
            <Field label="Cidade">
              <Input
                value={form.address?.city ?? ""}
                onChange={(e) =>
                  setForm({ ...form, address: { ...form.address, city: e.target.value } })
                }
              />
            </Field>
            <Field label="UF">
              <Input
                value={form.address?.state ?? ""}
                onChange={(e) =>
                  setForm({ ...form, address: { ...form.address, state: e.target.value } })
                }
              />
            </Field>
            <Field label="CEP">
              <Input
                value={form.address?.zip ?? ""}
                onChange={(e) =>
                  setForm({ ...form, address: { ...form.address, zip: e.target.value } })
                }
              />
            </Field>
            <Field label="Vendedor responsável">
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={form.salesperson_id ?? ""}
                onChange={(e) => setForm({ ...form, salesperson_id: e.target.value || null })}
              >
                <option value="">Não definido</option>
                {(aux.data?.salespeople ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tabela de preços">
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={form.price_list_id ?? ""}
                onChange={(e) => setForm({ ...form, price_list_id: e.target.value || null })}
              >
                <option value="">Usar tabela geral vigente</option>
                {(aux.data?.priceLists ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Condição de pagamento">
              <Input
                value={form.payment_terms ?? ""}
                onChange={(e) => setForm({ ...form, payment_terms: e.target.value })}
                placeholder="Ex.: 28 dias / 2 parcelas"
              />
            </Field>
            <Field label="Observações" className="sm:col-span-2">
              <Textarea
                value={form.notes ?? ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <Checkbox
                checked={form.active}
                onCheckedChange={(v) => setForm({ ...form, active: !!v })}
              />
              Cliente ativo
            </label>
          </div>

          {form.id && (
            <div className="mt-2 rounded-lg border p-3">
              <p className="text-sm font-semibold">Lojas / filiais</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {(locations.data ?? []).length === 0 && <li>Nenhuma loja cadastrada.</li>}
                {(locations.data ?? []).map((l) => (
                  <li key={l.id as string}>
                    {l.name as string}
                    {(l.address as Address)?.city ? ` — ${(l.address as Address).city}` : ""}
                  </li>
                ))}
              </ul>
              {canWrite && (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Input
                    placeholder="Nome da loja/filial"
                    value={locName}
                    onChange={(e) => setLocName(e.target.value)}
                  />
                  <Input
                    placeholder="Cidade"
                    value={locCity}
                    onChange={(e) => setLocCity(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    onClick={() => addLocation.mutate()}
                    disabled={addLocation.isPending}
                  >
                    Adicionar
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => save.mutate()} disabled={!canWrite || save.isPending}>
              {save.isPending ? "Salvando..." : "Salvar cliente"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
