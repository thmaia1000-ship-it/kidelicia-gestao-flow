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
import { canWriteCommercial, useMembership } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/vendedores")({
  head: () => ({
    meta: [
      { title: "Vendedores e canais — Ki Delícia Gestão" },
      {
        name: "description",
        content:
          "Cadastro de vendedores, canais e vendas internas da fábrica, com apelidos aprovados para importação.",
      },
      { property: "og:title", content: "Vendedores e canais — Ki Delícia Gestão" },
      {
        property: "og:description",
        content: "Vendedores, canais e apelidos aprovados para importação de planilhas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Vendedores,
});

type Salesperson = {
  id: string;
  name: string;
  kind: string;
  aliases: string[];
  active: boolean;
  notes: string | null;
};

const KINDS = [
  { value: "vendedor", label: "Vendedor (pessoa)" },
  { value: "canal", label: "Canal de venda" },
  { value: "interno_fabrica", label: "Venda interna da fábrica" },
  { value: "nao_classificado", label: "Não classificado — revisar" },
];

const EMPTY: Salesperson = {
  id: "",
  name: "",
  kind: "vendedor",
  aliases: [],
  active: true,
  notes: "",
};

function Vendedores() {
  const { data: membership } = useMembership();
  const orgId = membership?.organization?.id;
  const canWrite = canWriteCommercial(membership?.roles ?? []);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Salesperson>(EMPTY);
  const [aliasText, setAliasText] = useState("");

  const list = useQuery({
    queryKey: ["salespeople", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salespeople")
        .select("*")
        .eq("organization_id", orgId!)
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as Salesperson[];
    },
  });

  const channels = useQuery({
    queryKey: ["channels", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_channels")
        .select("*")
        .eq("organization_id", orgId!)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Informe o nome.");
      const payload = {
        organization_id: orgId,
        name: form.name.trim(),
        kind: form.kind,
        aliases: aliasText
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
        active: form.active,
        notes: form.notes || null,
      };
      if (form.id) {
        const { error } = await supabase
          .from("salespeople")
          .update(payload as never)
          .eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("salespeople").insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      toast.success("Registro salvo.");
      await list.refetch();
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [channelName, setChannelName] = useState("");
  const addChannel = useMutation({
    mutationFn: async () => {
      if (!channelName.trim()) throw new Error("Informe o nome do canal.");
      const { error } = await supabase
        .from("sales_channels")
        .insert({ organization_id: orgId, name: channelName.trim() } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Canal criado.");
      setChannelName("");
      channels.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const columns: Column<Salesperson>[] = [
    { key: "name", header: "Nome" },
    {
      key: "kind",
      header: "Classificação",
      render: (r) => KINDS.find((k) => k.value === r.kind)?.label ?? r.kind,
    },
    {
      key: "aliases",
      header: "Apelidos aprovados",
      value: (r) => (r.aliases ?? []).join(", "),
      render: (r) => (r.aliases ?? []).join(", ") || "—",
    },
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
        title="Vendedores e canais"
        description="Cadastro separado dos usuários do sistema. FÁBRICA e apelidos das planilhas precisam de classificação antes de virarem vendedor ou canal."
        actions={
          canWrite ? (
            <Button
              onClick={() => {
                setForm(EMPTY);
                setAliasText("");
                setOpen(true);
              }}
            >
              <Plus className="size-4" /> Novo registro
            </Button>
          ) : null
        }
      />

      <Tabs defaultValue="vendedores">
        <TabsList>
          <TabsTrigger value="vendedores">Vendedores e responsáveis</TabsTrigger>
          <TabsTrigger value="canais">Canais</TabsTrigger>
        </TabsList>
        <TabsContent value="vendedores" className="mt-4">
          <DataTable
            columns={columns}
            rows={list.data ?? []}
            rowKey={(r) => r.id}
            loading={list.isLoading}
            onRowClick={(r) => {
              setForm(r);
              setAliasText((r.aliases ?? []).join(", "));
              setOpen(true);
            }}
          />
        </TabsContent>
        <TabsContent value="canais" className="mt-4 space-y-4">
          {canWrite && (
            <div className="flex flex-col gap-2 sm:flex-row sm:max-w-md">
              <Input
                placeholder="Nome do canal (ex.: Fábrica, Atacado)"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
              />
              <Button variant="outline" onClick={() => addChannel.mutate()}>
                Adicionar canal
              </Button>
            </div>
          )}
          <DataTable
            columns={[
              { key: "name", header: "Canal" },
              { key: "description", header: "Descrição" },
            ]}
            rows={(channels.data ?? []) as Record<string, unknown>[]}
            rowKey={(r) => String(r.id)}
            loading={channels.isLoading}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar registro" : "Novo vendedor/canal"}</DialogTitle>
            <DialogDescription>
              Apelidos só são usados na importação depois de aprovados aqui.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Field label="Nome *">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Classificação">
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value })}
              >
                {KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Apelidos aprovados (separados por vírgula)">
              <Input
                value={aliasText}
                onChange={(e) => setAliasText(e.target.value)}
                placeholder="CARVALHO, CRAVALHO"
              />
            </Field>
            <Field label="Observações">
              <Textarea
                value={form.notes ?? ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.active}
                onCheckedChange={(v) => setForm({ ...form, active: !!v })}
              />
              Ativo
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => save.mutate()} disabled={!canWrite || save.isPending}>
              {save.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
