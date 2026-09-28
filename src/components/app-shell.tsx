import { useState, type ReactNode } from "react";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Boxes,
  ClipboardList,
  Cog,
  FileText,
  Factory,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ReceiptText,
  ShoppingCart,
  Store,
  Truck,
  Upload,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABELS, useMembership } from "@/lib/session";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/painel", label: "Visão geral", icon: LayoutDashboard },
  { to: "/pre-vendas", label: "Pré-vendas", icon: ClipboardList },
  { to: "/orcamentos", label: "Orçamentos", icon: FileText },
  { to: "/pedidos", label: "Pedidos e vendas", icon: ShoppingCart },
  { to: "/clientes", label: "Clientes e lojas", icon: Store },
  { to: "/produtos", label: "Produtos e preços", icon: Package },
  { to: "/vendedores", label: "Vendedores e canais", icon: UserRound },
  { to: "/estoque", label: "Estoque", icon: Boxes },
  { to: "/producao", label: "Produção", icon: Factory },
  { to: "/compras", label: "Compras", icon: Truck },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/relatorios", label: "Relatórios", icon: ReceiptText },
  { to: "/importacoes", label: "Importações", icon: Upload },
  { to: "/pendencias", label: "Pendências", icon: AlertTriangle },
  { to: "/configuracoes", label: "Configurações", icon: Cog },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { data: membership, isLoading } = useMembership();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (!membership?.active || !membership.organization) {
    return <Onboarding onSignOut={signOut} />;
  }

  const orgName = membership.organization.name;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 shrink-0 overflow-y-auto bg-sidebar text-sidebar-foreground transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-sidebar-primary">Ki Delícia</p>
            <p className="truncate text-base font-bold">{orgName}</p>
          </div>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Fechar menu">
            <X className="size-5" />
          </button>
        </div>
        <nav className="space-y-1 p-2">
          {NAV.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-primary font-semibold text-sidebar-primary-foreground"
                    : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-foreground/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-card px-4 py-3">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir menu">
            <Menu className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{orgName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {membership.email} ·{" "}
              {membership.roles.map((r) => ROLE_LABELS[r]).join(", ") || "sem papel atribuído"}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="size-4" /> Sair
          </Button>
        </header>
        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

function Onboarding({ onSignOut }: { onSignOut: () => void }) {
  const { data: membership, refetch } = useMembership();
  const [name, setName] = useState("Ki Delícia Gestão");
  const [saving, setSaving] = useState(false);
  const pending = membership?.members.some((m) => m.status === "pendente");

  async function createOrg() {
    setSaving(true);
    const { error } = await supabase.rpc("create_organization", { _name: name });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Organização criada. Você é o administrador.");
    await refetch();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-6">
        {pending ? (
          <>
            <h1 className="text-xl font-bold">Acesso aguardando aprovação</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sua solicitação foi registrada. Um administrador precisa liberar seu acesso e atribuir
              um perfil antes de você ver os dados.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold">Criar a operação</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Nenhuma organização está vinculada a este usuário. Crie a operação principal — você
              ficará como administrador e poderá aprovar os demais usuários.
            </p>
            <div className="mt-4 space-y-2">
              <Label htmlFor="orgname">Nome do sistema</Label>
              <Input id="orgname" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <Button className="mt-4 w-full" onClick={createOrg} disabled={saving}>
              {saving ? "Criando..." : "Criar organização"}
            </Button>
          </>
        )}
        <Button variant="ghost" className="mt-3 w-full" onClick={onSignOut}>
          Sair
        </Button>
      </div>
    </div>
  );
}
