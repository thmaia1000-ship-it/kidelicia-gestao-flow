import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ROLES = ["administrador", "gestor", "comercial", "financeiro", "producao", "consulta"] as const;

type Ctx = { supabase: any; userId: string };

async function assertAdmin(ctx: Ctx, orgId: string) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _org: orgId,
    _role: "administrador",
  });
  if (error || !data) throw new Error("Somente administradores podem gerenciar acessos.");
}

async function setRoles(admin: any, orgId: string, userId: string, roles: string[]) {
  const { error: delErr } = await admin
    .from("user_roles")
    .delete()
    .eq("organization_id", orgId)
    .eq("user_id", userId);
  if (delErr) throw new Error(delErr.message);
  if (roles.length) {
    const { error } = await admin
      .from("user_roles")
      .insert(roles.map((role) => ({ organization_id: orgId, user_id: userId, role })));
    if (error) throw new Error(error.message);
  }
}

export const listOrgUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orgId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as Ctx, data.orgId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: members }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("organization_members").select("*").eq("organization_id", data.orgId),
      supabaseAdmin.from("user_roles").select("*").eq("organization_id", data.orgId),
    ]);
    const ids = (members ?? []).map((m) => m.user_id);
    const { data: profiles } = ids.length
      ? await supabaseAdmin.from("profiles").select("*").in("id", ids)
      : { data: [] as { id: string; full_name: string | null; email: string | null }[] };
    return (members ?? []).map((m) => {
      const p = (profiles ?? []).find((x) => x.id === m.user_id);
      return {
        memberId: m.id,
        userId: m.user_id,
        status: m.status as string,
        fullName: p?.full_name ?? "",
        email: p?.email ?? "",
        roles: (roles ?? []).filter((r) => r.user_id === m.user_id).map((r) => r.role as string),
      };
    });
  });

export const createOrgUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        orgId: z.string().uuid(),
        email: z.string().trim().email("E-mail inválido").max(255),
        fullName: z.string().trim().min(2, "Informe o nome").max(120),
        password: z.string().min(8, "Senha com no mínimo 8 caracteres").max(72),
        roles: z.array(z.enum(ROLES)).min(1, "Selecione ao menos um perfil"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as Ctx, data.orgId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (error || !created.user) {
      throw new Error(
        error?.message?.includes("already") ? "Já existe um usuário com este e-mail." : error?.message ?? "Falha ao criar usuário",
      );
    }
    const uid = created.user.id;
    await supabaseAdmin.from("profiles").upsert({ id: uid, full_name: data.fullName, email: data.email });
    const { error: mErr } = await supabaseAdmin
      .from("organization_members")
      .insert({ organization_id: data.orgId, user_id: uid, status: "ativo" });
    if (mErr) {
      await supabaseAdmin.auth.admin.deleteUser(uid);
      throw new Error(mErr.message);
    }
    await setRoles(supabaseAdmin, data.orgId, uid, data.roles);
    await supabaseAdmin.from("audit_events").insert({
      organization_id: data.orgId,
      actor: (context as Ctx).userId,
      entity: "users",
      entity_id: uid,
      action: "criar_acesso",
      after_state: { email: data.email, roles: data.roles },
      source: "configuracoes",
    });
    return { userId: uid };
  });

export const updateOrgUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        orgId: z.string().uuid(),
        userId: z.string().uuid(),
        fullName: z.string().trim().min(2).max(120),
        password: z.string().max(72).optional(),
        status: z.enum(["pendente", "ativo", "inativo"]),
        roles: z.array(z.enum(ROLES)),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await assertAdmin(ctx, data.orgId);
    if (data.userId === ctx.userId) throw new Error("Não é possível alterar o próprio acesso.");
    if (data.password && data.password.length < 8) throw new Error("Senha com no mínimo 8 caracteres");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: member } = await supabaseAdmin
      .from("organization_members")
      .select("id, status")
      .eq("organization_id", data.orgId)
      .eq("user_id", data.userId)
      .maybeSingle();
    if (!member) throw new Error("Usuário não pertence a esta organização.");
    const { data: before } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("organization_id", data.orgId)
      .eq("user_id", data.userId);

    const upd: { password?: string; user_metadata: { full_name: string } } = {
      user_metadata: { full_name: data.fullName },
    };
    if (data.password) upd.password = data.password;
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, upd);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("profiles").update({ full_name: data.fullName }).eq("id", data.userId);
    await supabaseAdmin.from("organization_members").update({ status: data.status }).eq("id", member.id);
    await setRoles(supabaseAdmin, data.orgId, data.userId, data.roles);
    await supabaseAdmin.from("audit_events").insert({
      organization_id: data.orgId,
      actor: ctx.userId,
      entity: "users",
      entity_id: data.userId,
      action: "editar_acesso",
      before_state: { status: member.status, roles: (before ?? []).map((r) => r.role) },
      after_state: { status: data.status, roles: data.roles, password_changed: !!data.password },
      source: "configuracoes",
    });
    return { ok: true };
  });
