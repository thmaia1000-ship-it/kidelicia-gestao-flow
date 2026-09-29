import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { num } from "@/lib/fmt";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: string;
  /** Valor usado para busca e ordenação. */
  value?: (row: T) => string | number | null | undefined;
  render?: (row: T) => ReactNode;
  align?: "left" | "right";
  /** Soma exibida no rodapé, calculada sobre o conjunto filtrado (não só a página). */
  sum?: boolean;
  sumFormat?: (total: number) => string;
  className?: string;
};

type Props<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  pageSize?: number;
  toolbar?: ReactNode;
  searchPlaceholder?: string;
  loading?: boolean;
};

function rawValue<T>(col: Column<T>, row: T): string | number {
  const v = col.value ? col.value(row) : (row as Record<string, unknown>)[col.key];
  if (v === null || v === undefined) return "";
  return typeof v === "number" ? v : String(v);
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  emptyMessage = "Nenhum registro encontrado.",
  pageSize = 15,
  toolbar,
  searchPlaceholder = "Buscar...",
  loading,
}: Props<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      columns.some((c) => String(rawValue(c, row)).toLowerCase().includes(term)),
    );
  }, [rows, search, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = rawValue(col, a);
      const bv = rawValue(col, b);
      if (typeof av === "number" && typeof bv === "number") return av - bv;
      return String(av).localeCompare(String(bv), "pt-BR", { numeric: true });
    });
    return sortDir === "asc" ? copy : copy.reverse();
  }, [filtered, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const sums = useMemo(() => {
    const out: Record<string, number> = {};
    for (const col of columns) {
      if (!col.sum) continue;
      out[col.key] = sorted.reduce((acc, row) => acc + Number(rawValue(col, row) || 0), 0);
    }
    return out;
  }, [sorted, columns]);

  const hasSums = columns.some((c) => c.sum);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={searchPlaceholder}
            className="pl-8"
          />
        </div>
        {toolbar}
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-secondary/70 text-secondary-foreground">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-3 py-2 text-left font-semibold whitespace-nowrap",
                    col.align === "right" && "text-right",
                  )}
                >
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 hover:underline"
                    onClick={() => {
                      if (sortKey === col.key) {
                        setSortDir(sortDir === "asc" ? "desc" : "asc");
                      } else {
                        setSortKey(col.key);
                        setSortDir("asc");
                      }
                    }}
                  >
                    {col.header}
                    {sortKey === col.key &&
                      (sortDir === "asc" ? (
                        <ArrowUp className="size-3" />
                      ) : (
                        <ArrowDown className="size-3" />
                      ))}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-6 text-center text-muted-foreground"
                >
                  Carregando...
                </td>
              </tr>
            )}
            {!loading && pageRows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-6 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
            {!loading &&
              pageRows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn("border-t", onRowClick && "cursor-pointer hover:bg-secondary/40")}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-3 py-2 align-top",
                        col.align === "right" && "text-right tabular-nums",
                        col.className,
                      )}
                    >
                      {col.render ? col.render(row) : String(rawValue(col, row) || "—")}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
          {hasSums && (
            <tfoot className="border-t-2 bg-secondary/50 font-semibold">
              <tr>
                {columns.map((col, i) => (
                  <td
                    key={col.key}
                    className={cn("px-3 py-2", col.align === "right" && "text-right tabular-nums")}
                  >
                    {col.sum
                      ? (col.sumFormat ?? ((t: number) => num(t)))(sums[col.key] ?? 0)
                      : i === 0
                        ? `Total (${sorted.length} registro${sorted.length === 1 ? "" : "s"})`
                        : ""}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="flex flex-col items-center justify-between gap-2 text-sm text-muted-foreground sm:flex-row">
        <span>
          Mostrando {pageRows.length} de {sorted.length} registro(s) filtrado(s) — {rows.length} no
          total
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setPage(currentPage - 1)}
          >
            Anterior
          </Button>
          <span>
            Página {currentPage} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setPage(currentPage + 1)}
          >
            Próxima
          </Button>
        </div>
      </div>
    </div>
  );
}
