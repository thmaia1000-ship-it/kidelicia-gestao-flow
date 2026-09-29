import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock, Filter, Plus, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { DataTable, type Column } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { dateTimeBR } from "@/lib/fmt";
import { canWriteCommercial, useMembership } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/pendencias")({
  head: () => ({
    meta: [
      { title: "Pendências de Planilhas e Cadastros — Ki Delícia Gestão" },
      {
        name: "description",
        content:
          "Lista de pendências e conflitos identificados nas planilhas de origem, aguardando conferência e resolução humana.",
      },
      { property: "og:title", content: "Pendências — Ki Delícia Gestão" },
      { property: "og:description", content: "Pendências de cadastro e importação a conferir." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PendenciasPage,
});

const PENDENCIAS_PLANILHAS = [
  {
    title: "1. Códigos 107/108 associados a produtos diferentes e código 202 em broa/mini broa",
    kind: "codigo_duplicado",
    severity: "alta",
    details:
      "Na sugestão Otavio, códigos 107 e 108 aparecem em descrições divergentes. Código 202 aparece em broa e mini broa nos pedidos. Regra: Não usar código legado como chave primária nem fundir cadastros automaticamente.",
  },
  {
    title: "2. EANs compartilhados por descrições diferentes (Banana Chips vs Doces)",
    kind: "ean_compartilhado",
    severity: "alta",
    details:
      "EAN 0040141138767 aparece em banana chips salgada e cocada; 0040141138781 em banana chips doce e doce de leite. Regra: Conservar dado original e exigir revisão antes de ativar mapeamento.",
  },
  {
    title: "3. Código 113 repetido com preços divergentes (R$ 0,95 e R$ 10,00)",
    kind: "preco_divergente",
    severity: "alta",
    details:
      "Código 113 aparece duas vezes na mesma sugestão com preços 0,95 e 10,00. Regra: Não selecionar silenciosamente o último valor; manter pendente até confirmação comercial.",
  },
  {
    title: "4. Embalagens divergentes (25g vs 35g e 70g vs 170g)",
    kind: "embalagem_divergente",
    severity: "media",
    details:
      "Pururuca descrita como 25g versus 35g; biscoitos descritos como 70g versus 170g; banana chips com apresentações variadas. Regra: Não inferir correção apenas pelo nome.",
  },
  {
    title: "5. CRAVALHO / CARVALHO e referências HELP / CARV / FÁBRICA",
    kind: "vendedor_canal",
    severity: "media",
    details:
      "CRAVALHO em janeiro e CARVALHO em dezembro podem ser a mesma pessoa; HELP, CARV e FÁBRICA exigem classificação antes de virar vendedor ou canal. FÁBRICA não é pessoa física.",
  },
  {
    title: "6. Erro de fórmula #VALUE! na célula I50 da sugestão Otavio",
    kind: "erro_planilha",
    severity: "alta",
    details:
      "A célula I50 contém erro #VALUE!, fora do total principal I49. Regra: Registrar ocorrência; não importar como produto nem transformar em zero silenciosamente.",
  },
  {
    title: "7. Anotação “19*” e divergências no consolidado anual 2025",
    kind: "historico_divergente",
    severity: "media",
    details:
      "No consolidado anual, W6 contém “19*”. Janeiro tem polvilho 102 no anual e 102,5 no relatório de vendedores; broa 711 no anual e 112 nos vendedores. Reconciliar sem sobrescrever a fonte.",
  },
  {
    title: "8. Referências legadas repetidas VENDA 832 e PEDIDO 676",
    kind: "referencia_legada",
    severity: "media",
    details:
      "Ambos os pedidos Otavio e Super Nova exibem os mesmos números VENDA 832 e PEDIDO 676. Regra: Criar IDs internos únicos e manter as referências legadas com aviso de coincidência.",
  },
  {
    title: "9. Sugestão e Pedido Super Nova com mesmo total (R$ 1.478,00), mas dados distintos",
    kind: "vinculo_transacao",
    severity: "alta",
    details:
      "Ambos totalizam R$ 1.478,00, mas possuem referências de datas e pagamento diferentes. Regra: Igualdade de total não comprova identidade; exigir vínculo confirmado.",
  },
  {
    title: "10. Múltiplos CNPJs e emitentes em FATURADO POR",
    kind: "emitente_ambiguo",
    severity: "media",
    details:
      "Identificações distintas em FATURADO POR nas planilhas. Regra: Não escolher automaticamente CNPJ emitente; validar entidade fiscal aplicável.",
  },
  {
    title: "11. Parcelamento sem valores explícitos em Super Nova",
    kind: "financeiro_parcelas",
    severity: "media",
    details:
      "Duas datas de vencimento no pedido Super Nova sem indicação de valores por parcela. Regra: Não presumir divisão igual como fato histórico; aguardar conferência.",
  },
  {
    title: "12. Categorias históricas ETIQ MANUEL, ETIQ TOMAS e DOCES",
    kind: "classificacao_categoria",
    severity: "baixa",
    details:
      "Preservar as categorias originais das planilhas até classificação confirmada. Não descartá-las nem classificá-las como despesa automaticamente.",
  },
];

type IssueRow = {
  id: string;
  title: string;
  kind: string;
  severity: string;
  status: string;
  details: string | null;
  resolution: string | null;
  created_at: string;
};

function PendenciasPage() {
  const { data: membership } = useMembership();
  const orgId = membership?.organization?.id;
  const canWrite = canWriteCommercial(membership?.roles ?? []);
  const queryClient = useQueryClient();

  const [filterSeverity, setFilterSeverity] = useState("todas");
  const [filterStatus, setFilterStatus] = useState("todas");

  // Modal de Resolução
  const [selectedIssue, setSelectedIssue] = useState<IssueRow | null>(null);
  const [resolutionText, setResolutionText] = useState("");
  const [resolutionStatus, setResolutionStatus] = useState("resolvida");
  const [saving, setSaving] = useState(false);

  const list = useQuery({
    queryKey: ["issues", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pending_issues")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as IssueRow[];
    },
  });

  // Popular pendências conhecidas se vazio
  async function handleSeedKnownIssues() {
    if (!orgId) return;
    setSaving(true);
    try {
      const payload = PENDENCIAS_PLANILHAS.map((p) => ({
        organization_id: orgId,
        title: p.title,
        kind: p.kind,
        severity: p.severity,
        details: p.details,
        source: "levantamento_planilhas",
        status: "aberta",
      }));

      const { error } = await supabase.from("pending_issues").insert(payload as never);
      if (error) throw error;
      toast.success("12 pendências documentadas gravadas com sucesso no sistema!");
      list.refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao gravar pendências");
    } finally {
      setSaving(false);
    }
  }

  // Gravar decisão / resolução
  async function handleSaveResolution(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedIssue) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("pending_issues")
        .update({
          status: resolutionStatus,
          resolution: resolutionText,
          resolved_at: resolutionStatus === "resolvida" ? new Date().toISOString() : null,
        } as never)
        .eq("id", selectedIssue.id);

      if (error) throw error;
      toast.success("Decisão gravada com sucesso!");
      setSelectedIssue(null);
      list.refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar pendência");
    } finally {
      setSaving(false);
    }
  }

  const issues = list.data || [];
  const filteredIssues = issues.filter((i) => {
    const matchSev = filterSeverity === "todas" || i.severity === filterSeverity;
    const matchSt = filterStatus === "todas" || i.status === filterStatus;
    return matchSev && matchSt;
  });

  return (
    <div className="space-y-6">
      {/* Header com Identidade Ki Delícia */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-[#ED1C24] px-2 py-0.5 text-xs font-black text-white">
              GOVERNANÇA & DADOS
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              Conferência dos arquivos de origem
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#202124] mt-1">
            Pendências de Planilhas e Cadastros
          </h1>
          <p className="text-sm text-muted-foreground">
            Ocorrências, conflitos e ambiguidades levantados nas planilhas Ki Delícia para
            conferência e resolução humana.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {issues.length === 0 && (
            <Button
              onClick={handleSeedKnownIssues}
              disabled={saving}
              className="bg-[#B5121B] hover:bg-[#8f0d14] text-white text-xs font-bold"
            >
              <Plus className="mr-1.5 size-4" /> Carregar 12 Pendências Documentadas
            </Button>
          )}
        </div>
      </div>

      {/* Regra de Negócio */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-900 flex items-start gap-3">
        <AlertTriangle className="size-5 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-sm">
            Princípio de Integridade: Nenhuma Correção Silenciosa ou Automática
          </p>
          <p className="mt-1 text-amber-800">
            Nenhuma divergência das planilhas históricas pode ser descartada, fundida ou ignorada
            sem decisão auditada. Códigos repetidos, EANs compartilhados, divergências de peso (25g
            vs 35g) e erros de fórmula (#VALUE!) são tratados como pendências ativas até validação
            pelo responsável comercial.
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3 rounded-lg border text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Filter className="size-4 text-muted-foreground" />
            <span className="font-semibold text-muted-foreground">Gravidade:</span>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="rounded border bg-background px-2.5 py-1"
            >
              <option value="todas">Todas</option>
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-muted-foreground">Situação:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded border bg-background px-2.5 py-1"
            >
              <option value="todas">Todas</option>
              <option value="aberta">Abertas</option>
              <option value="em_revisao">Em Revisão</option>
              <option value="resolvida">Resolvidas</option>
              <option value="ignorada">Ignoradas</option>
            </select>
          </div>
        </div>

        <span className="text-muted-foreground">
          {filteredIssues.length} pendência(s) listada(s)
        </span>
      </div>

      {/* Tabela de Pendências */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#202124] text-white font-semibold">
                <th className="px-3 py-3">Pendência / Conflito Documentado</th>
                <th className="px-3 py-3">Tipo</th>
                <th className="px-3 py-3">Gravidade</th>
                <th className="px-3 py-3">Situação</th>
                <th className="px-3 py-3">Registro</th>
                <th className="px-3 py-3 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y text-xs">
              {filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                    {issues.length === 0
                      ? "Nenhuma pendência gravada no banco. Clique no botão acima para carregar as 12 pendências documentadas das planilhas."
                      : "Nenhuma pendência encontrada com os filtros selecionados."}
                  </td>
                </tr>
              ) : (
                filteredIssues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-muted/20">
                    <td className="px-3 py-3 max-w-md">
                      <p className="font-bold text-[#202124]">{issue.title}</p>
                      {issue.details && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                          {issue.details}
                        </p>
                      )}
                      {issue.resolution && (
                        <p className="text-[11px] text-green-700 font-semibold mt-1">
                          Decisão: {issue.resolution}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3 font-mono text-[10px] text-muted-foreground">
                      {issue.kind}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                          issue.severity === "alta"
                            ? "bg-red-100 text-red-800"
                            : issue.severity === "media"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {issue.severity}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                          issue.status === "resolvida"
                            ? "bg-green-100 text-green-800"
                            : issue.status === "em_revisao"
                              ? "bg-blue-100 text-blue-800"
                              : issue.status === "ignorada"
                                ? "bg-gray-100 text-gray-800"
                                : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {issue.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground text-[11px]">
                      {dateTimeBR(issue.created_at)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedIssue(issue);
                          setResolutionText(issue.resolution || "");
                          setResolutionStatus(issue.status || "resolvida");
                        }}
                        className="h-7 text-xs"
                      >
                        {issue.status === "resolvida" ? "Ver Decisão" : "Resolver"}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Resolução / Decisão da Pendência */}
      <Dialog open={!!selectedIssue} onOpenChange={(open) => !open && setSelectedIssue(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#202124]">
              Decisão de Governança sobre a Pendência
            </DialogTitle>
          </DialogHeader>

          {selectedIssue && (
            <form onSubmit={handleSaveResolution} className="space-y-3 text-xs">
              <div className="bg-[#F5F6F8] p-3 rounded-lg space-y-1">
                <span className="font-bold text-sm text-[#202124]">{selectedIssue.title}</span>
                <p className="text-muted-foreground text-xs mt-1">{selectedIssue.details}</p>
              </div>

              <div className="space-y-1">
                <Label>Situação da Decisão</Label>
                <select
                  value={resolutionStatus}
                  onChange={(e) => setResolutionStatus(e.target.value)}
                  className="w-full rounded border bg-background px-3 py-2 text-xs"
                >
                  <option value="aberta">Aberta (Em Aberto)</option>
                  <option value="em_revisao">Em Revisão Comercial</option>
                  <option value="resolvida">Resolvida / Mapeamento Aprovado</option>
                  <option value="ignorada">Ignorada Justificada</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label>Justificativa / Decisão Registrada</Label>
                <Textarea
                  placeholder="Ex.: Validação aprovada pelo gestor. O código 107 refere-se à Banana Chips Salgada 40g e o preço negociado é R$ 3,20."
                  value={resolutionText}
                  onChange={(e) => setResolutionText(e.target.value)}
                  required
                  className="text-xs min-h-[90px]"
                />
              </div>

              <DialogFooter className="border-t pt-3">
                <Button type="button" variant="outline" onClick={() => setSelectedIssue(null)}>
                  Fechar
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-[#B5121B] hover:bg-[#8f0d14] text-white"
                >
                  {saving ? "Salvando..." : "Gravar Decisão"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
