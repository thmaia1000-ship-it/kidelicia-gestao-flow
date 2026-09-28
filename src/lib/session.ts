import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "administrador"
  | "gestor"
  | "comercial"
  | "financeiro"
  | "producao"
  | "consulta";

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async (): Promise<Session | null> => {
      const { data } = await supabase.auth.getSession();
      return data.session ?? null;
    },
    staleTime: 30_000,
  });
}

export type Organization = {
  id: string;
  name: string;
  legal_name: string | null;
  trade_name: string | null;
  document: string | null;
  phone: string | null;
  email: string | null;
  timezone: string;
  logo_url: string | null;
  address: Record<string, unknown>;
};

export type Membership = {
  userId: string;
  email: string | null;
  members: { id: string; status: string; organization_id: string }[];
  active: { id: string; status: string; organization_id: string } | null;
  organization: Organization | null;
  roles: AppRole[];
};

export function useMembership() {
  const { data: session, isLoading } = useSession();
  const userId = session?.user?.id ?? null;

  const query = useQuery({
    queryKey: ["membership", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Membership> => {
      const { data: members, error } = await supabase
        .from("organization_members")
        .select("id, status, organization_id")
        .eq("user_id", userId!);
      if (error) throw error;

      const active = members?.find((m) => m.status === "ativo") ?? null;
      let organization: Organization | null = null;
      let roles: AppRole[] = [];

      if (active) {
        const [{ data: org }, { data: r }] = await Promise.all([
          supabase.from("organizations").select("*").eq("id", active.organization_id).maybeSingle(),
          supabase
            .from("user_roles")
            .select("role")
            .eq("organization_id", active.organization_id)
            .eq("user_id", userId!),
        ]);
        organization = (org as Organization | null) ?? null;
        roles = ((r ?? []) as { role: AppRole }[]).map((x) => x.role);
      }

      return {
        userId: userId!,
        email: session?.user?.email ?? null,
        members: members ?? [],
        active,
        organization,
        roles,
      };
    },
  });

  return { ...query, isLoading: isLoading || query.isLoading };
}

export function canWriteCommercial(roles: AppRole[]): boolean {
  return roles.some((r) => r === "administrador" || r === "gestor" || r === "comercial");
}

export function canAdmin(roles: AppRole[]): boolean {
  return roles.some((r) => r === "administrador" || r === "gestor");
}

export const ROLE_LABELS: Record<AppRole, string> = {
  administrador: "Administrador",
  gestor: "Gestor",
  comercial: "Comercial",
  financeiro: "Financeiro",
  producao: "Produção/Estoque",
  consulta: "Consulta",
};
