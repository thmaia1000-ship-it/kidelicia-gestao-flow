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
  TrendingUp,
  Upload,
  UserRound,
  X,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABELS, useMembership } from "@/lib/session";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
  roles?: string[];
}

const PRIMARY_NAV: NavItem[] = [
  { to: "/painel", label: "Dashboard Administrativo", icon: LayoutDashboard },
  { to: "/dashboard-comercial", label: "Dashboard Comercial", icon: TrendingUp },
  { to: "/pedidos", label: "Pedidos de Venda", icon: ShoppingCart },
  { to: "/orcamentos", label: "Orçamentos", icon: FileText },
  { to: "/pre-vendas", label: "Pré-Vendas / Sugestões", icon: ClipboardList },
  { to: "/estoque", label: "Estoque de Produtos", icon: Boxes },
  { to: "/producao", label: "Ordens à Indústria", icon: Factory },
];

const CADASTROS_NAV: NavItem[] = [
  { to: "/clientes", label: "Clientes e Lojas", icon: Store },
  { to: "/produtos", label: "Produtos e Preços", icon: Package },
  { to: "/vendedores", label: "Vendedores e Canais", icon: UserRound },
];

const SUPORTE_NAV: NavItem[] = [
  { to: "/relatorios", label: "Relatórios", icon: ReceiptText },
  { to: "/importacoes", label: "Importações", icon: Upload },
  { to: "/pendencias", label: "Pendências de Planilhas", icon: AlertTriangle },
  { to: "/configuracoes", label: "Configurações", icon: Cog },
];

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
      <div className="flex min-h-screen items-center justify-center bg-[#F5F6F8] text-muted-foreground text-sm">
        <div className="flex flex-col items-center gap-2">
          <BrandLogo size="md" />
          <p className="mt-2 text-xs font-semibold text-[#202124]">
            Carregando sistema comercial...
          </p>
        </div>
      </div>
    );
  }

  if (!membership?.active || !membership.organization) {
    return <Onboarding onSignOut={signOut} />;
  }

  const orgName = membership.organization.name;
  const userRoles = membership.roles;
  const isAdmin = userRoles.includes("administrador");

  return (
    <div className="flex min-h-screen bg-[#F5F6F8]">
      {/* Sidebar Grafite (#202124) com Destaques Vermelho/Amarelo */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 shrink-0 overflow-y-auto bg-[#202124] text-white transition-transform lg:static lg:translate-x-0 border-r border-[#33363a]",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between border-b border-[#33363a] p-4">
          <BrandLogo size="sm" subtitle="Gestão Comercial" />
          <button
            className="lg:hidden text-white/70 hover:text-white"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="p-3 space-y-5">
          {/* Menu Principal */}
          <div>
            <p className="px-3 text-[10px] font-black uppercase tracking-wider text-[#FFEA00]">
              Menu Principal
            </p>
            <nav className="mt-1 space-y-0.5">
              {PRIMARY_NAV.map((item) => {
                const active = pathname === item.to || pathname.startsWith(item.to + "/");
                return (
                  <Link
                    key={item.to}
                    to={item.to as never}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors select-none",
                      active
                        ? "bg-[#ED1C24] font-bold text-white shadow-sm"
                        : "text-white/80 hover:bg-white/10 hover:text-[#FFEA00]",
                    )}
                  >
                    <item.icon
                      className={cn("size-4 shrink-0", active ? "text-[#FFEA00]" : "text-white/70")}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Cadastros de Apoio */}
          <div>
            <p className="px-3 text-[10px] font-black uppercase tracking-wider text-white/50">
              Cadastros de Apoio
            </p>
            <nav className="mt-1 space-y-0.5">
              {CADASTROS_NAV.map((item) => {
                const active = pathname === item.to || pathname.startsWith(item.to + "/");
                return (
                  <Link
                    key={item.to}
                    to={item.to as never}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors select-none",
                      active
                        ? "bg-[#ED1C24] font-bold text-white shadow-sm"
                        : "text-white/80 hover:bg-white/10 hover:text-[#FFEA00]",
                    )}
                  >
                    <item.icon
                      className={cn("size-4 shrink-0", active ? "text-[#FFEA00]" : "text-white/70")}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Gestão, Relatórios e Importações */}
          <div>
            <p className="px-3 text-[10px] font-black uppercase tracking-wider text-white/50">
              Gestão & Histórico
            </p>
            <nav className="mt-1 space-y-0.5">
              {SUPORTE_NAV.map((item) => {
                const active = pathname === item.to || pathname.startsWith(item.to + "/");
                return (
                  <Link
                    key={item.to}
                    to={item.to as never}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors select-none",
                      active
                        ? "bg-[#ED1C24] font-bold text-white shadow-sm"
                        : "text-white/80 hover:bg-white/10 hover:text-[#FFEA00]",
                    )}
                  >
                    <item.icon
                      className={cn("size-4 shrink-0", active ? "text-[#FFEA00]" : "text-white/70")}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* User Card in Sidebar Footer */}
        <div className="border-t border-[#33363a] p-3 text-xs bg-black/20">
          <p className="truncate font-semibold text-white/90">{orgName}</p>
          <p className="truncate text-[11px] text-white/60">{membership.email}</p>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="inline-block rounded bg-[#FFEA00]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#FFEA00]">
              {userRoles.map((r) => ROLE_LABELS[r]).join(", ") || "Operador"}
            </span>
          </div>
        </div>
      </aside>

      {/* Backdrop Mobile */}
      {open && (
        <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Navbar */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-white px-4 py-2.5 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-1 rounded-md text-[#202124] hover:bg-muted"
              onClick={() => setOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="size-5" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold uppercase tracking-wider text-[#B5121B]">
                Ki Delícia Gestão Comercial
              </p>
              <p className="truncate text-xs text-muted-foreground">{orgName} · Operação Ativa</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <span className="block text-xs font-bold text-[#202124]">{membership.email}</span>
              <span className="block text-[10px] text-muted-foreground uppercase font-semibold">
                Perfil: {userRoles.map((r) => ROLE_LABELS[r]).join(", ") || "Operador"}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="h-8 text-xs border-[#d1d5db] text-[#202124] hover:bg-red-50 hover:text-[#B5121B]"
            >
              <LogOut className="size-3.5 mr-1" /> Sair
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function Onboarding({ onSignOut }: { onSignOut: () => void }) {
  const { data: membership, refetch } = useMembership();
  const [name, setName] = useState("Ki Delícia Gestão Comercial");
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
    toast.success("Organização criada. Você é o administrador principal da Ki Delícia.");
    await refetch();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F6F8] p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#e2e5e9] bg-white p-8 shadow-xl">
        <div className="flex justify-center mb-6">
          <BrandLogo size="lg" />
        </div>

        {pending ? (
          <>
            <h1 className="text-xl font-black text-[#202124] text-center">
              Acesso Aguardando Aprovação
            </h1>
            <p className="mt-2 text-xs text-muted-foreground text-center">
              Sua solicitação de acesso foi registrada no sistema. Um administrador da Ki Delícia
              precisa autorizar sua conta e conceder o perfil de acesso adequado.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-black text-[#202124] text-center">
              Configurar Operação Ki Delícia
            </h1>
            <p className="mt-2 text-xs text-muted-foreground text-center">
              Nenhuma organização comercial está vinculada a este usuário. Cadastre o nome da
              operação principal para iniciar como administrador.
            </p>
            <div className="mt-5 space-y-2 text-xs">
              <Label htmlFor="orgname" className="font-bold">
                Nome da Operação Comercial
              </Label>
              <Input
                id="orgname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 text-sm"
              />
            </div>
            <Button
              className="mt-5 w-full h-10 font-bold bg-[#B5121B] hover:bg-[#8f0d14] text-white"
              onClick={createOrg}
              disabled={saving}
            >
              {saving ? "Criando Operação..." : "Criar Organização e Começar"}
            </Button>
          </>
        )}
        <Button variant="ghost" className="mt-3 w-full text-xs" onClick={onSignOut}>
          Sair da Conta
        </Button>
      </div>
    </div>
  );
}
