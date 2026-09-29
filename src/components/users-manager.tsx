import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ROLE_LABELS, type AppRole } from "@/lib/session";
import { createOrgUser, listOrgUsers, updateOrgUser } from "@/lib/users.functions";

type Row = {
  memberId: string;
  userId: string;
  status: string;
  fullName: string;
  email: string;
  roles: string[];
};

type Form = {
  userId?: string;
  email: string;
  fullName: string;
  password: string;
  status: "pendente" | "ativo" | "inativo";
  roles: AppRole[];
};

const EMPTY: Form = { email: "", fullName: "", password: "", status: "ativo", roles: ["consulta"] };
const STATUS_LABEL: Record<string, string> = { ativo: "Ativo", pendente: "Pendente", inativo: "Inativo" };

export function UsersManager({ orgId, selfId }: { orgId: string; selfId?: string }) {
  const list = useServerFn(listOrgUsers);
  const create = useServerFn(createOrgUser);
  const update = useServerFn(updateOrgUser);
  const [form, setForm] = useState<Form | null>(null);

  const users = useQuery({
    queryKey: ["org-users", orgId],
    queryFn: () => list({ data: { orgId } }) as Promise<Row[]>,
  });

  const save = useMutation({
    mutationFn: async (f: Form) => {
      if (f.userId) {
        await update({
          data: {
            orgId,
            userId: f.userId,
            fullName: f.fullName,
            password: f.password || undefined,
            status: f.status,
            roles: f.roles,
          },
        });
      } else {
        await create({
          data: { orgId, email: f.email, fullName: f.fullName, password: f.password, roles: f.roles },
        });
      }
    },
    onSuccess: (_d, f) => {
      toast.success(f.userId ? "Acesso atualizado." : "Acesso criado.");
      setForm(null);
      users.refetch();
    },
    onError: (e: Error) => {
      let msg = e.message;
      try {
        const parsed = JSON.parse(msg);
        if (Array.isArray(parsed)) msg = parsed.map((x) => x.message).join("; ");
      } catch {
        /* texto simples */
      }
      toast.error(msg);
    },
  });

  const toggleRole = (r: AppRole) =>
    form &&
    setForm({
      ...form,
      roles: form.roles.includes(r) ? form.roles.filter((x) => x !== r) : [...form.roles, r],
    });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Acessos ao sistema</p>
        <Button onClick={() => setForm({ ...EMPTY })}>Novo acesso</Button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-secondary/70">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Nome</th>
              <th className="px-3 py-2 text-left font-semibold">E-mail</th>
              <th className="px-3 py-2 text-left font-semibold">Situação</th>
              <th className="px-3 py-2 text-left font-semibold">Perfis</th>
              <th className="px-3 py-2 text-left font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.isLoading && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-muted-foreground">Carregando...</td>
              </tr>
            )}
            {users.error && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-destructive">{(users.error as Error).message}</td>
              </tr>
            )}
            {(users.data ?? []).map((u) => {
              const isSelf = u.userId === selfId;
              return (
                <tr key={u.memberId} className="border-t">
                  <td className="px-3 py-2">{u.fullName || "—"}{isSelf && " (você)"}</td>
                  <td className="px-3 py-2">{u.email || "—"}</td>
                  <td className="px-3 py-2">{STATUS_LABEL[u.status] ?? u.status}</td>
                  <td className="px-3 py-2">
                    {u.roles.map((r) => ROLE_LABELS[r as AppRole] ?? r).join(", ") || "—"}
                  </td>
                  <td className="px-3 py-2">
                    {isSelf ? (
                      <span className="text-xs text-muted-foreground">Não é possível alterar o próprio acesso.</span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setForm({
                            userId: u.userId,
                            email: u.email,
                            fullName: u.fullName,
                            password: "",
                            status: u.status as Form["status"],
                            roles: u.roles as AppRole[],
                          })
                        }
                      >
                        Editar
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form?.userId ? "Editar acesso" : "Novo acesso"}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-3">
              <label className="block space-y-1 text-sm">
                <span>Nome completo</span>
                <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </label>
              <label className="block space-y-1 text-sm">
                <span>E-mail de acesso</span>
                <Input
                  type="email"
                  value={form.email}
                  disabled={!!form.userId}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span>{form.userId ? "Nova senha (deixe em branco para manter)" : "Senha inicial (mín. 8 caracteres)"}</span>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </label>
              {form.userId && (
                <label className="block space-y-1 text-sm">
                  <span>Situação</span>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-2"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as Form["status"] })}
                  >
                    <option value="ativo">Ativo</option>
                    <option value="pendente">Pendente</option>
                    <option value="inativo">Inativo (bloqueado)</option>
                  </select>
                </label>
              )}
              <div className="space-y-2 text-sm">
                <span>Perfis de permissão</span>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(ROLE_LABELS) as AppRole[]).map((r) => (
                    <label key={r} className="flex items-center gap-2">
                      <Checkbox checked={form.roles.includes(r)} onCheckedChange={() => toggleRole(r)} />
                      {ROLE_LABELS[r]}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
            <Button disabled={save.isPending} onClick={() => form && save.mutate(form)}>
              {save.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
