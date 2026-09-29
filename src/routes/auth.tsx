import { useEffect, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Mail, ShieldAlert, ArrowRight, KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { BrandLogo } from "@/components/brand-logo";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — Ki Delícia Gestão Comercial" },
      {
        name: "description",
        content:
          "Acesso ao sistema de gestão comercial da Ki Delícia: controle de vendas, estoque e solicitações à indústria.",
      },
      { property: "og:title", content: "Entrar — Ki Delícia Gestão Comercial" },
      {
        property: "og:description",
        content: "Acesso restrito à operação comercial Ki Delícia.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"entrar" | "recuperar" | "primeiro_admin">("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.navigate({ to: "/painel", replace: true });
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "recuperar") {
        if (!email.trim()) {
          toast.error("Informe seu e-mail cadastrado.");
          return;
        }
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin + "/auth",
        });
        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success("E-mail de recuperação enviado! Verifique sua caixa de entrada.");
        setMode("entrar");
        return;
      }

      if (mode === "primeiro_admin") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: fullName.trim() },
            emailRedirectTo: window.location.origin + "/painel",
          },
        });
        if (error) throw error;

        if (!data.session) {
          toast.success("Conta do administrador criada. Confirme o e-mail para acessar.");
          setMode("entrar");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }

      await queryClient.invalidateQueries();
      router.navigate({ to: "/painel", replace: true });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Credenciais inválidas. Verifique e-mail e senha.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center p-4 lg:p-8">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-[#e2e5e9] bg-white shadow-xl grid lg:grid-cols-2">
        {/* Painel Esquerdo: Apresentação da Marca (PLACA NOVA EXPOSITOR.pdf) */}
        <div className="bg-gradient-to-br from-[#ED1C24] via-[#B5121B] to-[#202124] text-white p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden">
          {/* Círculos decorativos da marca */}
          <div className="absolute -top-12 -right-12 size-48 rounded-full bg-[#FFEA00]/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 size-56 rounded-full bg-[#ED1C24]/30 blur-2xl pointer-events-none" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-sm border border-white/20 text-[#FFEA00]">
              <span>Sistema Oficial Ki Delícia</span>
            </div>

            <div className="mt-6">
              <span className="text-xs font-black uppercase tracking-widest text-[#FFEA00]">
                Biscoitos · Polvilhos · Broas
              </span>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mt-1">
                Ki Delícia
              </h1>
              <p className="text-sm font-bold text-[#FFEA00] uppercase tracking-wider mt-0.5">
                Gestão Comercial Integrada
              </p>
            </div>

            <p className="mt-4 text-xs sm:text-sm text-white/80 leading-relaxed max-w-sm">
              Operação comercial de distribuição de alimentos: pedidos de clientes, estoque de
              produtos acabados, controle de lotes e solicitações de produção à indústria parceira.
            </p>
          </div>

          <div className="relative z-10 mt-8 pt-6 border-t border-white/15 space-y-2 text-xs text-white/75">
            <div className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[#FFEA00]" />
              <span>Controle rigoroso de fardos e unidades base</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[#FFEA00]" />
              <span>Ordens à indústria com recebimento conferido</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[#FFEA00]" />
              <span>Acesso restrito por perfil profissional</span>
            </div>
          </div>
        </div>

        {/* Painel Direito: Formulário de Autenticação */}
        <div className="p-8 lg:p-12 flex flex-col justify-center bg-white">
          <div className="mb-6">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#B5121B]">
              Autenticação Operacional
            </span>
            <h2 className="text-2xl font-black text-[#202124] mt-0.5">
              {mode === "entrar"
                ? "Entrar no Sistema"
                : mode === "recuperar"
                  ? "Recuperar Senha"
                  : "Primeiro Acesso (Administrador)"}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {mode === "entrar"
                ? "Insira seu e-mail corporativo e senha de acesso."
                : mode === "recuperar"
                  ? "Digite seu e-mail cadastrado para receber o link de redefinição."
                  : "Cadastre o primeiro administrador responsável pela organização."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "primeiro_admin" && (
              <div className="space-y-1.5">
                <Label htmlFor="nome" className="text-xs font-bold text-[#202124]">
                  Nome Completo
                </Label>
                <Input
                  id="nome"
                  placeholder="Seu nome"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="h-10 text-sm"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-bold text-[#202124]">
                E-mail Profissional
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@kidelicia.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-9 h-10 text-sm"
                />
              </div>
            </div>

            {mode !== "recuperar" && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="senha" className="text-xs font-bold text-[#202124]">
                    Senha
                  </Label>
                  {mode === "entrar" && (
                    <button
                      type="button"
                      onClick={() => setMode("recuperar")}
                      className="text-[11px] font-semibold text-[#B5121B] hover:underline"
                    >
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input
                    id="senha"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pl-9 pr-10 h-10 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-[#202124]"
                    aria-label={showPassword ? "Ocultar senha" : "Ver senha"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 font-bold bg-[#B5121B] hover:bg-[#8f0d14] text-white shadow-sm"
            >
              {loading
                ? "Aguarde..."
                : mode === "entrar"
                  ? "Entrar no Sistema"
                  : mode === "recuperar"
                    ? "Enviar Link de Recuperação"
                    : "Criar Administrador"}
            </Button>
          </form>

          {/* Links alternativos */}
          <div className="mt-6 border-t pt-4 space-y-2 text-center text-xs">
            {mode === "entrar" ? (
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setMode("primeiro_admin")}
                  className="font-medium text-muted-foreground hover:text-[#202124] block w-full"
                >
                  Primeiro acesso da empresa?{" "}
                  <strong className="text-[#B5121B]">Configurar Administrador</strong>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setMode("entrar")}
                className="font-semibold text-[#B5121B] hover:underline"
              >
                ← Voltar para o Login
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
