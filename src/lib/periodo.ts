// Períodos de filtro como datas "yyyy-MM-dd" no fuso da fábrica (Brasília).
// Servidor (UTC na Vercel) e navegador calculam sempre o mesmo intervalo.
export const TZ = "America/Sao_Paulo";

export type Preset = "diario" | "semanal" | "mensal" | "personalizado";
export type Intervalo = { inicio: string; fim: string };

const isoFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function hojeISO() {
  return isoFmt.format(new Date());
}

// Aritmética em UTC puro para não depender do fuso de quem roda
function toUTC(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}
function fromUTC(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function intervaloDoPreset(preset: Exclude<Preset, "personalizado">): Intervalo {
  const hoje = hojeISO();
  const d = toUTC(hoje);
  if (preset === "diario") return { inicio: hoje, fim: hoje };
  if (preset === "semanal") {
    const dia = d.getUTCDay();
    const segunda = new Date(d);
    segunda.setUTCDate(d.getUTCDate() - (dia === 0 ? 6 : dia - 1));
    const domingo = new Date(segunda);
    domingo.setUTCDate(segunda.getUTCDate() + 6);
    return { inicio: fromUTC(segunda), fim: fromUTC(domingo) };
  }
  const primeiro = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const ultimo = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return { inicio: fromUTC(primeiro), fim: fromUTC(ultimo) };
}

const dataHoraFmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TZ,
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDataHora(iso: string) {
  return dataHoraFmt.format(new Date(iso)).replace(",", "");
}

export function formatData(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// <input type="datetime-local"> ⇄ ISO. Brasília não tem horário de verão desde 2019.
export function isoParaInput(iso: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(iso))
      .map((x) => [x.type, x.value]),
  );
  return `${p["year"]}-${p["month"]}-${p["day"]}T${p["hour"]}:${p["minute"]}`;
}

export function inputParaISO(valor: string) {
  return `${valor}:00-03:00`;
}
