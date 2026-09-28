/** Formatação pt-BR. Datas comerciais são tratadas como datas puras (sem fuso). */

export function brl(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number.isFinite(n) ? n : 0,
  );
}

export function num(value: number | string | null | undefined, decimals = 2): string {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number.isFinite(n) ? n : 0);
}

/** Quantidade: mostra até 4 casas, sem zeros inúteis. */
export function qty(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 4 }).format(
    Number.isFinite(n) ? n : 0,
  );
}

/** "2026-03-09" -> "09/03/2026" sem conversão de fuso. */
export function dateBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return "—";
  return `${d}/${m}/${y}`;
}

export function dateTimeBR(iso: string | null | undefined, timeZone = "America/Manaus"): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone,
  }).format(new Date(iso));
}

export function todayISO(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

/** Arredondamento monetário explícito em 2 casas (centavos). */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function onlyDigits(v: string | null | undefined): string {
  return (v ?? "").replace(/\D/g, "");
}
