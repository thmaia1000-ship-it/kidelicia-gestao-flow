import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ki Delícia Gestão — sistema comercial" },
      {
        name: "description",
        content:
          "Sistema de gestão comercial da Ki Delícia: cadastros, pré-vendas, orçamentos e pedidos com rastreabilidade, substituindo controles dispersos em planilhas.",
      },
      { property: "og:title", content: "Ki Delícia Gestão — sistema comercial" },
      {
        property: "og:description",
        content:
          "Cadastros, pré-vendas, orçamentos e pedidos integrados para a operação de biscoitos, polvilhos, broas e salgadinhos Ki Delícia.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Ki Delícia
            </p>
            <p className="text-lg font-bold">Ki Delícia Gestão</p>
          </div>
          <Link
            to="/auth"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Entrar
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
          Gestão comercial integrada para biscoitos, polvilhos, broas e salgadinhos
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Cadastros, pré-vendas, orçamentos e pedidos em registros integrados, com unidades
          comerciais e de estoque separadas, histórico preservado e rastreabilidade. Acesso restrito
          por convite do administrador.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            {
              t: "Fase 1 — em operação",
              d: "Empresa e emitentes, clientes e lojas, vendedores e canais, produtos, apresentações e tabelas de preço, pré-vendas, orçamentos e pedidos em rascunho.",
            },
            {
              t: "Fases 2 e 3 — previstas",
              d: "Importação dos arquivos reais com deduplicação e reconciliação; títulos, recebimentos, reservas e expedição parcial.",
            },
            {
              t: "O que não é feito",
              d: "Nada de NF-e, boleto registrado, conciliação bancária ou números inventados de caixa e estoque.",
            },
          ].map((c) => (
            <div key={c.t} className="rounded-lg border bg-card p-4">
              <p className="font-semibold">{c.t}</p>
              <p className="mt-2 text-sm text-muted-foreground">{c.d}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
