import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { Field } from "@/routes/_authenticated/clientes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABELS, canAdmin, useMembership, type AppRole } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Ki Delícia Gestão" },
      {
        name: "description",
        content: "Dados da empresa, emitentes vinculados, usuários e matriz de permissões.",
      },
      { property: "og:title", content: "Configurações — Ki Delícia Gestão" },
      { property: "og:description", content: "Empresa, emitentes, usuários e permissões." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Configuracoes,
});

const MATRIZ = [
  ["Administrador", "Tudo, incluindo usuários e papéis"],
  ["Gestor", "Cadastros, comercial, exclusões; sem gerir papéis"],
  ["Comercial", "Carteira autorizada: clientes, pré-vendas, orçamentos e pedidos"],
  ["Financeiro", "Títulos e contas (Fase 3); leitura comercial"],
  ["Produção/Estoque", "Demanda, produtos e insumos (Fase 4); sem dados financeiros"],
  ["Consulta", "Somente leitura"],
];

function Configuracoes() {
  const { data: membership, refetch } = useMembership();
  const org = membership?.organization;
  const orgId = org?.id;
  const admin = canAdmin(membership?.roles ?? []);
  const isAdministrator = (membership?.roles ?? []).includes("administrador");

  const [name, setName] = useState(org?.name ?? "");
  const [legal, setLegal] = useState(org?.legal_name ?? "");
  const [doc, setDoc] = useState(org?.document ?? "");
  const [tz, setTz] = useState(org?.timezone ?? "America/Manaus");

  const saveOrg = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("organizations")
        .update({
          name: name || "Ki Delícia Gestão",
          legal_name: legal || null,
          document: doc || null,
          timezone: tz || "America/Manaus",
        } as never)
        .eq("id", orgId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Dados da empresa salvos.");
      refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const issuers = useQuery({
    queryKey: ["issuers-all", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("issuers")
        .select("*")
        .eq("organization_id", orgId!)
        .order("legal_name");
      if (error) throw error;
      return (data ?? []) as Record<string, unknown>[];
    },
  });

  const [issuer, setIssuer] = useState({ legal_name: "", trade_name: "", document: "" });
  const addIssuer = useMutation({
    mutationFn: async () => {
      if (!issuer.legal_name.trim()) throw new Error("Informe a razão social do emitente.");
      const { error } = await supabase.from("issuers").insert({
        organization_id: orgId,
        legal_name: issuer.legal_name.trim(),
        trade_name: issuer.trade_name || null,
        document: issuer.document || null,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Emitente cadastrado.");
      setIssuer({ legal_name: "", trade_name: "", document: "" });
      issuers.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const members = useQuery({
    queryKey: ["members", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const [{ data: m }, { data: r }] = await Promise.all([
        supabase.from("organization_members").select("*").eq("organization_id", orgId!),
        supabase.from("user_roles").select("*").eq("organization_id", orgId!),
      ]);
      return { members: m ?? [], roles: r ?? [] };
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("organization_members")
        .update({ status } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Acesso atualizado.");
      members.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const grantRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .insert({ organization_id: orgId, user_id: userId, role } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Papel atribuído.");
      members.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Configurações"
        description="Nome do sistema editável, emitentes separados de clientes e vendedores, e permissões aplicadas no banco (não apenas escondendo botões)."
      />

      <Tabs defaultValue="empresa">
        <TabsList>
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
          <TabsTrigger value="emitentes">Emitentes</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários e permissões</TabsTrigger>
        </TabsList>

        <TabsContent value="empresa" className="mt-4">
          <div className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2">
            <Field label="Nome do sistema">
              <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!admin} />
            </Field>
            <Field label="Razão social">
              <Input value={legal} onChange={(e) => setLegal(e.target.value)} disabled={!admin} />
            </Field>
            <Field label="CNPJ (texto)">
              <Input value={doc} onChange={(e) => setDoc(e.target.value)} disabled={!admin} />
            </Field>
            <Field label="Fuso horário da empresa">
              <Input value={tz} onChange={(e) => setTz(e.target.value)} disabled={!admin} />
            </Field>
            <div className="sm:col-span-2">
              <Button onClick={() => saveOrg.mutate()} disabled={!admin || saveOrg.isPending}>
                {saveOrg.isPending ? "Salvando..." : "Salvar"}
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                Logo: quando houver a arte isolada da marca, o upload será habilitado. Por enquanto o
                nome é exibido em texto.
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="emitentes" className="mt-4 space-y-4">
          {admin && (
            <div className="grid gap-2 rounded-lg border bg-card p-4 sm:grid-cols-4">
              <Input
                placeholder="Razão social"
                value={issuer.legal_name}
                onChange={(e) => setIssuer({ ...issuer, legal_name: e.target.value })}
              />
              <Input
                placeholder="Nome fantasia"
                value={issuer.trade_name}
                onChange={(e) => setIssuer({ ...issuer, trade_name: e.target.value })}
              />
              <Input
                placeholder="CNPJ (texto)"
                value={issuer.document}
                onChange={(e) => setIssuer({ ...issuer, document: e.target.value })}
              />
              <Button variant="outline" onClick={() => addIssuer.mutate()}>
                Adicionar emitente
              </Button>
            </div>
          )}
          <DataTable
            columns={[
              { key: "legal_name", header: "Razão social" },
              { key: "trade_name", header: "Fantasia" },
              { key: "document", header: "CNPJ" },
            ]}
            rows={issuers.data ?? []}
            rowKey={(r) => String(r.id)}
            loading={issuers.isLoading}
            emptyMessage="Nenhum emitente cadastrado. Nenhum CNPJ de “FATURADO POR” foi escolhido automaticamente."
          />
        </TabsContent>

        <TabsContent value="usuarios" className="mt-4 space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm font-semibold">Matriz de permissões</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {MATRIZ.map(([p, d]) => (
                <li key={p}>
                  <strong>{p}:</strong> {d}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              Um usuário não pode atribuir um papel a si mesmo, e nenhum dado de outra organização é
              acessível — a regra está no banco.
            </p>
          </div>

          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-secondary/70">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Usuário</th>
                  <th className="px-3 py-2 text-left font-semibold">Situação</th>
                  <th className="px-3 py-2 text-left font-semibold">Papéis</th>
                  <th className="px-3 py-2 text-left font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {(members.data?.members ?? []).map((m) => {
                  const uid = m.user_id as string;
                  const roles = (members.data?.roles ?? []).filter((r) => r.user_id === uid);
                  const isSelf = uid === membership?.userId;
                  return (
                    <tr key={m.id as string} className="border-t">
                      <td className="px-3 py-2">
                        {isSelf ? `${membership?.email} (você)` : uid.slice(0, 8) + "…"}
                      </td>
                      <td className="px-3 py-2">{m.status as string}</td>
                      <td className="px-3 py-2">
                        {roles.map((r) => ROLE_LABELS[r.role as AppRole]).join(", ") || "—"}
                      </td>
                      <td className="px-3 py-2">
                        {isAdministrator && !isSelf && (
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setStatus.mutate({
                                  id: m.id as string,
                                  status: m.status === "ativo" ? "inativo" : "ativo",
                                })
                              }
                            >
                              {m.status === "ativo" ? "Desativar" : "Aprovar acesso"}
                            </Button>
                            <select
                              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                              defaultValue=""
                              onChange={(e) => {
                                if (!e.target.value) return;
                                grantRole.mutate({ userId: uid, role: e.target.value as AppRole });
                                e.target.value = "";
                              }}
                            >
                              <option value="">Atribuir papel...</option>
                              {(Object.keys(ROLE_LABELS) as AppRole[]).map((r) => (
                                <option key={r} value={r}>
                                  {ROLE_LABELS[r]}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        {isSelf && (
                          <span className="text-xs text-muted-foreground">
                            Não é possível alterar o próprio papel.
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
