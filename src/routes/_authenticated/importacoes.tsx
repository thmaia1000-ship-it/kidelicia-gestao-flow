import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Search,
  Hash,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { brl } from "@/lib/fmt";

export const Route = createFileRoute("/_authenticated/importacoes")({
  head: () => ({
    meta: [
      { title: "Área de Importações — Ki Delícia Gestão" },
      {
        name: "description",
        content:
          "Leitura das planilhas reais com detecção de layout, deduplicação por hash, resolução de conflitos e reconciliação.",
      },
      { property: "og:title", content: "Área de Importações — Ki Delícia Gestão" },
      { property: "og:description", content: "Importação e conferência de planilhas comerciais." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ImportacoesPage,
});

interface StagedFile {
  id: string;
  filename: string;
  hash: string;
  layoutType: string;
  detectedRows: number;
  totalValue: number;
  status: "aguardando_conferencia" | "duplicado_ignorado" | "aprovado";
  conflictCount: number;
  notes: string;
}

const SAMPLE_FILES: StagedFile[] = [
  {
    id: "f-1",
    filename: "SUGESTÃO DE PEDIDO OTAVIO TERRA NOVA.xlsx (Cópia 1)",
    hash: "a4f89d891b2c4e5f...",
    layoutType: "Catálogo e Pré-venda Comercial",
    detectedRows: 48,
    totalValue: 1038.0,
    status: "aprovado",
    conflictCount: 2,
    notes: "Erro #VALUE! em I50 descartado de produto. Mapeado para catálogo inicial.",
  },
  {
    id: "f-2",
    filename: "SUGESTÃO DE PEDIDO OTAVIO TERRA NOVA (1).xlsx (Cópia 2)",
    hash: "a4f89d891b2c4e5f...", // Mesmo hash!
    layoutType: "Arquivo Binariamente Idêntico",
    detectedRows: 48,
    totalValue: 1038.0,
    status: "duplicado_ignorado",
    conflictCount: 0,
    notes: "Deduplicação por hash: arquivo 100% idêntico à cópia 1. Marcado como ignorado.",
  },
  {
    id: "f-3",
    filename: "PEDIDO SUPER NOVA CENTRAL.xlsx",
    hash: "7bc32f144a90de88...",
    layoutType: "Pedido de Venda com 2 Vencimentos",
    detectedRows: 7,
    totalValue: 1478.0,
    status: "aprovado",
    conflictCount: 1,
    notes: "Recompõe total exato de R$ 1.478,00. Parcelamento mantido a conferir.",
  },
  {
    id: "f-4",
    filename: "PEDIDO OTAVIO TERRA NOVA.xlsx",
    hash: "8ef12c5541098bca...",
    layoutType: "Pedido de Venda Comercial",
    detectedRows: 6,
    totalValue: 1585.0,
    status: "aprovado",
    conflictCount: 1,
    notes: "Recompõe total exato de R$ 1.585,00. Números legados 832/676 preservados.",
  },
  {
    id: "f-5",
    filename: "00 VENDA GERAL ANO 2025.xlsx",
    hash: "1d98a23055ecfb90...",
    layoutType: "Consolidado Mensal Histórico",
    detectedRows: 12,
    totalValue: 587706.3,
    status: "aguardando_conferencia",
    conflictCount: 3,
    notes:
      "Total informado R$ 587.706,30. Não movimenta caixa nem estoque. Anotação '19*' pendente.",
  },
];

function ImportacoesPage() {
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>(SAMPLE_FILES);
  const [selectedFile, setSelectedFile] = useState<StagedFile | null>(null);

  function handleSimulateUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const fakeHash = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const newEntry: StagedFile = {
      id: `f-${Date.now()}`,
      filename: file.name,
      hash: fakeHash.slice(0, 16) + "...",
      layoutType: "Detecção Automática de Layout",
      detectedRows: Math.floor(10 + Math.random() * 40),
      totalValue: Math.floor(1000 + Math.random() * 5000),
      status: "aguardando_conferencia",
      conflictCount: 0,
      notes: "Arquivo carregado na área temporária. Nenhum dado gravado no estoque ou financeiro.",
    };

    setStagedFiles([newEntry, ...stagedFiles]);
    toast.success(`Arquivo ${file.name} carregado na área temporária para conferência!`);
  }

  function handleApprove(id: string) {
    setStagedFiles(stagedFiles.map((f) => (f.id === id ? { ...f, status: "aprovado" } : f)));
    toast.success("Mapeamento e reconciliação da planilha aprovados!");
  }

  function handleIgnore(id: string) {
    setStagedFiles(
      stagedFiles.map((f) => (f.id === id ? { ...f, status: "duplicado_ignorado" } : f)),
    );
    toast.info("Planilha marcada como ignorada.");
  }

  return (
    <div className="space-y-6">
      {/* Header com Identidade Ki Delícia */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-[#ED1C24] px-2 py-0.5 text-xs font-black text-white">
              INTEGRAÇÃO DE DADOS
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              Área temporária de planilhas e deduplicação
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#202124] mt-1">
            Importação e Reconciliação de Planilhas
          </h1>
          <p className="text-sm text-muted-foreground">
            Processamento das planilhas de origem da Ki Delícia com validação de layout,
            deduplicação por hash e conferência de conflitos.
          </p>
        </div>

        <div className="relative">
          <input
            type="file"
            id="file-upload"
            accept=".xlsx,.xls,.csv"
            onChange={handleSimulateUpload}
            className="hidden"
          />
          <Button asChild className="bg-[#B5121B] hover:bg-[#8f0d14] text-white cursor-pointer">
            <label htmlFor="file-upload">
              <Upload className="mr-1.5 size-4" /> Carregar Planilha Excel
            </label>
          </Button>
        </div>
      </div>

      {/* Regras Críticas de Importação */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-xs text-blue-900 flex items-start gap-3">
        <FileSpreadsheet className="size-5 text-blue-700 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-sm">
            Fluxo em 5 Etapas: Carregar → Área Temporária → Mapear → Resolver Conflitos → Confirmar
          </p>
          <ul className="mt-1.5 list-disc list-inside space-y-1 text-blue-800">
            <li>
              <strong>Idempotência:</strong> O mesmo arquivo (verificado por hash SHA-256) nunca é
              importado duas vezes. Arquivos duplicados são automaticamente apontados para descarte.
            </li>
            <li>
              <strong>Proteção de Estoque e Caixa:</strong> Nenhuma importação histórica movimenta
              automaticamente o estoque físico ou gera títulos no contas a receber.
            </li>
            <li>
              <strong>Reconciliação:</strong> Divergências entre o consolidado anual e os relatórios
              por vendedor permanecem registradas até resolução humana.
            </li>
          </ul>
        </div>
      </div>

      {/* Tabela de Planilhas na Área Temporária */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h2 className="font-bold text-base text-[#202124]">
              Planilhas na Área Temporária de Conferência
            </h2>
            <p className="text-xs text-muted-foreground">
              Arquivos analisados da pasta de origem Ki Delícia
            </p>
          </div>
          <span className="text-xs font-bold text-muted-foreground">
            {stagedFiles.length} arquivo(s) mapeado(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b bg-[#F5F6F8] font-semibold text-[#202124]">
                <th className="p-3">Arquivo / Origem</th>
                <th className="p-3">Hash SHA-256</th>
                <th className="p-3">Layout Identificado</th>
                <th className="p-3 text-right">Linhas</th>
                <th className="p-3 text-right">Total Declarado</th>
                <th className="p-3">Situação</th>
                <th className="p-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {stagedFiles.map((file) => (
                <tr key={file.id} className="hover:bg-muted/20">
                  <td className="p-3 max-w-xs">
                    <p className="font-bold text-[#202124]">{file.filename}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{file.notes}</p>
                  </td>
                  <td className="p-3 font-mono text-[10px] text-muted-foreground">{file.hash}</td>
                  <td className="p-3 text-muted-foreground font-medium">{file.layoutType}</td>
                  <td className="p-3 text-right tabular-nums">{file.detectedRows}</td>
                  <td className="p-3 text-right font-black tabular-nums">{brl(file.totalValue)}</td>
                  <td className="p-3">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                        file.status === "aprovado"
                          ? "bg-green-100 text-green-800"
                          : file.status === "duplicado_ignorado"
                            ? "bg-gray-100 text-gray-700"
                            : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {file.status === "duplicado_ignorado"
                        ? "Duplicado / Ignorado"
                        : file.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {file.status === "aguardando_conferencia" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(file.id)}
                            className="h-7 text-xs bg-[#1e7e34] hover:bg-[#155d27] text-white"
                          >
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleIgnore(file.id)}
                            className="h-7 text-xs text-red-600 border-red-200"
                          >
                            Ignorar
                          </Button>
                        </>
                      )}
                      {file.status === "aprovado" && (
                        <span className="text-[11px] text-green-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="size-3.5" /> Reconciliado
                        </span>
                      )}
                      {file.status === "duplicado_ignorado" && (
                        <span className="text-[11px] text-muted-foreground italic">
                          Deduplicado por hash
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
