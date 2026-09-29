import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Boxes, Factory, FileCheck, ShoppingCart, TrendingUp } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ki Delícia Gestão Comercial — Biscoitos, Polvilhos e Broas" },
      {
        name: "description",
        content:
          "Sistema de gestão comercial Ki Delícia: pedidos, estoque de produtos acabados, ordens à indústria e controle operacional.",
      },
      { property: "og:title", content: "Ki Delícia Gestão Comercial" },
      {
        property: "og:description",
        content:
          "Cadastros, vendas, estoque e solicitações de produção de produtos acabados à indústria Ki Delícia.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-[#F5F6F8] text-[#202124]">
      {/* Top Header */}
      <header className="border-b bg-white shadow-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <BrandLogo size="md" subtitle="Gestão Comercial" />

          <Button
            asChild
            size="sm"
            className="bg-[#B5121B] hover:bg-[#8f0d14] text-white font-bold"
          >
            <Link to="/auth">
              Acessar Sistema <ArrowRight className="ml-1 size-3.5" />
            </Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-12 items-center">
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#ED1C24]/10 px-3 py-1 text-xs font-bold text-[#B5121B]">
              <span className="size-2 rounded-full bg-[#ED1C24]" />
              Operação Comercial com Indústria Parceira
            </div>

            <h1 className="text-3xl font-black tracking-tight text-[#202124] sm:text-4xl lg:text-5xl leading-tight">
              Gestão Comercial de Biscoitos, Polvilhos, Broas e Salgadinhos
            </h1>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">
              Sistema integrado da <strong>Ki Delícia</strong>: emissão de pedidos com controle de
              fardos e unidades base, reserva de estoque, expedição com baixa física e{" "}
              <strong>
                solicitação de produtos acabados à indústria fornecedora por ordens de produção
              </strong>
              .
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Button
                asChild
                size="lg"
                className="bg-[#B5121B] hover:bg-[#8f0d14] text-white font-black px-6 shadow-md"
              >
                <Link to="/auth">
                  Entrar no Sistema <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-[#202124] font-bold">
                <Link to="/auth">Primeiro Acesso (Admin)</Link>
              </Button>
            </div>
          </div>

          <div className="lg:col-span-5 rounded-2xl border bg-white p-6 shadow-xl space-y-4 border-t-4 border-t-[#ED1C24]">
            <h2 className="text-base font-black text-[#202124] border-b pb-2 flex items-center justify-between">
              <span>Pilares da Versão Operacional</span>
              <span className="text-xs font-bold text-[#ED1C24] uppercase">Versão Ativa</span>
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-md bg-red-100 text-[#B5121B] shrink-0 mt-0.5">
                  <TrendingUp className="size-4" />
                </div>
                <div>
                  <strong className="text-[#202124] block">
                    Dashboards Administrativo e Comercial
                  </strong>
                  <span className="text-muted-foreground">
                    Visões executiva e de vendas separadas com métricas reais e atalhos rápidos.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-md bg-amber-100 text-amber-800 shrink-0 mt-0.5">
                  <ShoppingCart className="size-4" />
                </div>
                <div>
                  <strong className="text-[#202124] block">Vendas Fiéis às Planilhas</strong>
                  <span className="text-muted-foreground">
                    Conversão rigorosa de fardo x unidade (ex.: 80 UN = 2 fardos de 40), referências
                    legadas e reservas.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-md bg-green-100 text-green-800 shrink-0 mt-0.5">
                  <Boxes className="size-4" />
                </div>
                <div>
                  <strong className="text-[#202124] block">
                    Estoque Funcional com Entradas e Saídas
                  </strong>
                  <span className="text-muted-foreground">
                    Fórmula Disponível = Físico − Reservado − Bloqueado, sem saldos negativos.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-md bg-blue-100 text-blue-800 shrink-0 mt-0.5">
                  <Factory className="size-4" />
                </div>
                <div>
                  <strong className="text-[#202124] block">
                    Ordens à Indústria & Recebimento Conferido
                  </strong>
                  <span className="text-muted-foreground">
                    Solicitação comercial de produtos acabados. Entrada no estoque apenas com
                    quantidades aceitas.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
