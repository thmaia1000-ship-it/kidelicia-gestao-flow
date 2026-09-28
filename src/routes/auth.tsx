import { useEffect, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — Ki Delícia Gestão" },
      {
        name: "description",
        content:
          "Acesso ao sistema de gestão comercial da Ki Delícia: clientes, produtos, pré-vendas, orçamentos e pedidos.",
      },
      { property: "og:title", content: "Entrar — Ki Delícia Gestão" },
      {
        property: "og:description",
        content: "Acesso restrito ao sistema de gestão comercial da Ki Delícia.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.navigate({ to: "/painel", replace: true });
    });
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "criar") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin + "/painel",
          },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Conta criada. Confirme o e-mail para entrar.");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      await queryClient.invalidateQueries();
      router.navigate({ to: "/painel", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/painel",
    });
    if (result.error) {
      toast.error("Não foi possível entrar com o Google.");
      return;
    }
    if (result.redirected) return;
    await queryClient.invalidateQueries();
    router.navigate({ to: "/painel", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Ki Delícia</p>
        <h1 className="mt-1 text-2xl font-bold">Ki Delícia Gestão</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "entrar" ? "Entre para acessar a operação." : "Crie seu acesso."}
        </p>

        <form onSubmit={submit} className="mt-5 space-y-3">
          {mode === "criar" && (
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome completo</Label>
              <Input id="nome" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Aguarde..." : mode === "entrar" ? "Entrar" : "Criar conta"}
          </Button>
        </form>

        <Button variant="outline" className="mt-3 w-full" onClick={google}>
          Continuar com o Google
        </Button>

        <button
          className="mt-4 w-full text-sm text-muted-foreground underline"
          onClick={() => setMode(mode === "entrar" ? "criar" : "entrar")}
        >
          {mode === "entrar" ? "Não tenho acesso ainda" : "Já tenho conta"}
        </button>
      </div>
    </div>
  );
}
