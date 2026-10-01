import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  keepPreviousData,
  useQuery,
  useSuspenseQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Package,
  RefreshCw,
  Trash2,
  Pencil,
  LayoutDashboard,
  History,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getSilos,
  getMovimentos,
  getResumo,
  createCarregamento,
  createProducao,
  createReprocesso,
  createResiduo,
  updateMovimento,
  deleteMovimento,
  type MovimentoRow,
  type TipoMovimento,
} from "@/lib/balanco.functions";
import {
  formatData,
  formatDataHora,
  hojeISO,
  inputParaISO,
  intervaloDoPreset,
  isoParaInput,
  type Intervalo,
  type Preset,
} from "@/lib/periodo";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Nutrimilho · Balanço de Massa" },
      {
        name: "description",
        content:
          "Controle operacional de silos, carregamentos e produção de germen com filtros por período e histórico de movimentações.",
      },
      { property: "og:title", content: "Nutrimilho · Balanço de Massa" },
      {
        property: "og:description",
        content:
          "Controle operacional de silos, carregamentos e produção de germen com filtros por período e histórico de movimentações.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: async ({ context }) => {
    const intervalo = intervaloDoPreset("mensal");
    await Promise.all([
      context.queryClient.ensureQueryData({
        queryKey: ["silos"],
        queryFn: () => getSilos(),
      }),
      context.queryClient.ensureQueryData({
        queryKey: ["resumo", intervalo.inicio, intervalo.fim],
        queryFn: () => getResumo({ data: intervalo }),
      }),
      context.queryClient.ensureQueryData({
        queryKey: ["movimentos", intervalo.inicio, intervalo.fim],
        queryFn: () => getMovimentos({ data: intervalo }),
      }),
    ]);
  },
});

type Aba = "dashboard" | "historico";
type Silo = { id: string; nome: string; produto: string | null };

const movimentoInfo: Record<
  TipoMovimento,
  {
    nome: string;
    label: string;
    Icon: typeof ArrowDownLeft;
    sign: "+" | "−" | "";
    textClass: string;
  }
> = {
  producao: {
    nome: "Produção germen",
    label: "Entrada",
    Icon: ArrowDownLeft,
    sign: "+",
    textClass: "text-pro",
  },
  carregamento: {
    nome: "Carregamento",
    label: "Saída",
    Icon: ArrowUpRight,
    sign: "−",
    textClass: "text-car",
  },
  reprocesso: {
    nome: "Reprocesso",
    label: "Reprocesso",
    Icon: RefreshCw,
    sign: "+",
    textClass: "text-rep",
  },
  residuo: { nome: "Resíduo", label: "Resíduo", Icon: Trash2, sign: "", textClass: "text-res" },
};

const tiposOrdem: TipoMovimento[] = ["producao", "carregamento", "reprocesso", "residuo"];

function Index() {
  const queryClient = useQueryClient();
  const [aba, setAba] = useState<Aba>("dashboard");
  const [preset, setPreset] = useState<Preset>("mensal");
  const [intervalo, setIntervalo] = useState<Intervalo>(() => intervaloDoPreset("mensal"));

  const { data: silos = [] } = useSuspenseQuery({
    queryKey: ["silos"],
    queryFn: () => getSilos(),
  });

  // keepPreviousData: ao trocar o filtro, mantém os números antigos até chegarem os novos
  const { data: resumo, isFetching: carregandoResumo } = useQuery({
    queryKey: ["resumo", intervalo.inicio, intervalo.fim],
    queryFn: () => getResumo({ data: intervalo }),
    placeholderData: keepPreviousData,
  });

  const { data: movimentos = [], isFetching: carregandoMovimentos } = useQuery({
    queryKey: ["movimentos", intervalo.inicio, intervalo.fim],
    queryFn: () => getMovimentos({ data: intervalo }),
    placeholderData: keepPreviousData,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["silos"] });
    queryClient.invalidateQueries({ queryKey: ["resumo"] });
    queryClient.invalidateQueries({ queryKey: ["movimentos"] });
  };

  const escolherPreset = (p: Preset) => {
    setPreset(p);
    if (p !== "personalizado") setIntervalo(intervaloDoPreset(p));
  };

  const totalReprocessado = resumo?.totalReprocessado ?? 0;
  const totalResiduo = resumo?.totalResiduo ?? 0;
  const atualizando = carregandoResumo || carregandoMovimentos;

  return (
    <div className="min-h-screen bg-ink text-cream font-sans antialiased">
      <div className="h-1 w-full flex">
        <div className="flex-1 bg-sil" />
        <div className="flex-1 bg-car" />
        <div className="flex-1 bg-pro" />
        <div className="flex-1 bg-rep" />
        <div className="flex-1 bg-res" />
      </div>

      <header className="max-w-6xl mx-auto px-5 pt-8 pb-6 border-b border-line space-y-5">
        <div className="flex flex-wrap items-end gap-6 justify-between">
          <div className="flex items-center gap-4">
            <img src="/logo-nutrimilho.png" alt="Nutrimilho" className="h-10 w-auto" />
            <div className="h-9 w-px bg-line hidden sm:block" />
            <div>
              <p className="font-display text-xl leading-none font-extrabold text-sil">
                Balanço de Massa
              </p>
              <p className="text-mut text-xs mt-1 tracking-wide">
                GERMEN, REPROCESSO & RESÍDUOS · PAINEL DE MASSA
              </p>
            </div>
          </div>
          <div className="flex rounded-lg border border-line bg-panel p-1">
            {(
              [
                ["dashboard", "Dashboard", LayoutDashboard],
                ["historico", "Histórico", History],
              ] as const
            ).map(([valor, texto, Icon]) => (
              <button
                key={valor}
                onClick={() => setAba(valor)}
                className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors flex items-center gap-2 ${
                  aba === valor ? "bg-sil text-white" : "text-mut hover:text-cream"
                }`}
              >
                <Icon className="size-4" /> {texto}
              </button>
            ))}
          </div>
        </div>

        <FiltroPeriodo
          preset={preset}
          intervalo={intervalo}
          atualizando={atualizando}
          onPreset={escolherPreset}
          onIntervalo={setIntervalo}
        />
      </header>

      <main className="max-w-6xl mx-auto px-5 py-8 space-y-8">
        {aba === "dashboard" ? (
          <>
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <GlowCard color="sil">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.15em] text-sil">Nível dos silos</p>
                  <span className="size-2.5 rounded-full bg-sil shadow-[0_0_10px_#2f7d34]" />
                </div>
                <p className="font-mono text-4xl mt-3">{formatNumber(resumo?.estoqueAtual ?? 0)}</p>
                <p className="text-mut text-sm">kg · {silos.length} silos · agora</p>
                <div className="mt-4 h-2 rounded-full bg-panel2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-sil transition-all duration-700"
                    style={{ width: `${resumo?.percentualOcupacao ?? 0}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-mut">
                  Capacidade {formatNumber(resumo?.capacidadeTotal ?? 0)} kg
                </p>
              </GlowCard>

              <GlowCard color="pro">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.15em] text-pro">Produzido Germen</p>
                  <span className="size-2.5 rounded-full bg-pro shadow-[0_0_10px_#e8622c]" />
                </div>
                <p className="font-mono text-4xl mt-3">
                  {formatNumber(resumo?.totalProduzido ?? 0)}
                </p>
                <p className="text-mut text-sm">kg no período</p>
                <div className="mt-4 h-2 rounded-full bg-panel2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-pro transition-all duration-700"
                    style={{ width: `${(resumo?.totalProduzido ?? 0) > 0 ? 100 : 0}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-mut">Entrada de massa nos silos</p>
              </GlowCard>

              <GlowCard color="car">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.15em] text-car">Carregado</p>
                  <span className="size-2.5 rounded-full bg-car shadow-[0_0_10px_#f0a911]" />
                </div>
                <p className="font-mono text-4xl mt-3">
                  {formatNumber(resumo?.totalCarregado ?? 0)}
                </p>
                <p className="text-mut text-sm">kg no período</p>
                <div className="mt-4 h-2 rounded-full bg-panel2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-car transition-all duration-700"
                    style={{
                      width: `${percentOf(resumo?.totalCarregado, resumo?.totalProduzido)}%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-xs text-mut">
                  Saída de massa · {rendimento(resumo?.totalCarregado, resumo?.totalProduzido)} do
                  produzido
                </p>
              </GlowCard>
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <GlowCard color="rep">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.15em] text-rep">Reprocesso</p>
                  <span className="size-2.5 rounded-full bg-rep shadow-[0_0_10px_#1f8a8c]" />
                </div>
                <p className="font-mono text-4xl mt-3">{formatNumber(totalReprocessado)}</p>
                <p className="text-mut text-sm">kg no período · retorna ao silo</p>
                <div className="mt-4 h-2 rounded-full bg-panel2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-rep transition-all duration-700"
                    style={{ width: `${percentOf(totalReprocessado, resumo?.totalProduzido)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-mut">Sobre o total produzido no período</p>
              </GlowCard>

              <GlowCard color="res">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.15em] text-res">Resíduo</p>
                  <span className="size-2.5 rounded-full bg-res shadow-[0_0_10px_#b23b3b]" />
                </div>
                <p className="font-mono text-4xl mt-3">{formatNumber(totalResiduo)}</p>
                <p className="text-mut text-sm">kg no período · descartado</p>
                <div className="mt-4 h-2 rounded-full bg-panel2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-res transition-all duration-700"
                    style={{ width: `${percentOf(totalResiduo, resumo?.totalProduzido)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-mut">Sobre o total produzido no período</p>
              </GlowCard>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 rounded-2xl bg-panel border border-line p-5">
                <div className="flex items-center justify-between mb-4 gap-3">
                  <p className="font-display text-lg font-bold">
                    Últimas movimentações · {labelPeriodo(preset, intervalo)}
                  </p>
                  {movimentos.length > 10 && (
                    <button
                      onClick={() => setAba("historico")}
                      className="text-xs text-sil font-medium hover:underline shrink-0"
                    >
                      Ver todas ({movimentos.length})
                    </button>
                  )}
                </div>
                <TabelaMovimentos
                  movimentos={movimentos.slice(0, 10)}
                  silos={silos}
                  onChange={refresh}
                />
              </div>

              <div className="rounded-2xl bg-panel border border-line p-5">
                <p className="font-display text-lg mb-4 font-bold">Acumulado do período</p>
                <div className="space-y-4">
                  <BarraAcumulado
                    label="Germen produzido"
                    valor={resumo?.totalProduzido ?? 0}
                    pct={percentOf(resumo?.totalProduzido, resumo?.capacidadeTotal)}
                    cor="bg-pro"
                  />
                  <BarraAcumulado
                    label="Carregado"
                    valor={resumo?.totalCarregado ?? 0}
                    pct={percentOf(resumo?.totalCarregado, resumo?.capacidadeTotal)}
                    cor="bg-car"
                  />
                  <BarraAcumulado
                    label="Silos agora"
                    valor={resumo?.estoqueAtual ?? 0}
                    pct={resumo?.percentualOcupacao ?? 0}
                    cor="bg-sil"
                  />
                  <BarraAcumulado
                    label="Reprocesso"
                    valor={totalReprocessado}
                    pct={percentOf(totalReprocessado, resumo?.totalProduzido)}
                    cor="bg-rep"
                  />
                  <BarraAcumulado
                    label="Resíduo"
                    valor={totalResiduo}
                    pct={percentOf(totalResiduo, resumo?.totalProduzido)}
                    cor="bg-res"
                  />
                </div>
                <div className="mt-5 pt-4 border-t border-line rounded-xl bg-panel2 p-4 -mx-1">
                  <p className="text-xs text-mut">Balanço líquido (produzido − carregado)</p>
                  <p
                    className={`font-mono text-2xl mt-1 ${(resumo?.balanco ?? 0) >= 0 ? "text-pro" : "text-car"}`}
                  >
                    {(resumo?.balanco ?? 0) >= 0 ? "+" : ""}
                    {formatNumber(resumo?.balanco ?? 0)} kg
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl bg-panel border border-line p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="size-9 rounded-lg bg-panel2 border border-line grid place-items-center text-sil">
                  <Plus className="size-5" />
                </div>
                <div>
                  <p className="font-display text-lg font-bold">Lançamento rápido</p>
                  <p className="text-mut text-xs">
                    Registre produção, carregamento, reprocesso ou resíduo
                  </p>
                </div>
              </div>
              <LancamentoForm silos={silos} onSuccess={refresh} />
            </section>
          </>
        ) : (
          <Historico
            movimentos={movimentos}
            silos={silos}
            titulo={labelPeriodo(preset, intervalo)}
            onChange={refresh}
          />
        )}
      </main>
    </div>
  );
}

function FiltroPeriodo({
  preset,
  intervalo,
  atualizando,
  onPreset,
  onIntervalo,
}: {
  preset: Preset;
  intervalo: Intervalo;
  atualizando: boolean;
  onPreset: (p: Preset) => void;
  onIntervalo: (i: Intervalo) => void;
}) {
  const presets: [Preset, string][] = [
    ["diario", "Diário"],
    ["semanal", "Semanal"],
    ["mensal", "Mensal"],
    ["personalizado", "Personalizado"],
  ];

  // Datas trocadas (início depois do fim) são corrigidas em vez de dar período vazio
  const mudarData = (campo: keyof Intervalo, valor: string) => {
    if (!valor) return;
    const novo = { ...intervalo, [campo]: valor };
    if (novo.inicio > novo.fim) onIntervalo({ inicio: novo.fim, fim: novo.inicio });
    else onIntervalo(novo);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap rounded-lg border border-line bg-panel p-1">
        {presets.map(([p, texto]) => (
          <button
            key={p}
            onClick={() => onPreset(p)}
            className={`px-3 sm:px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${
              preset === p ? "bg-sil text-white" : "text-mut hover:text-cream"
            }`}
          >
            {texto}
          </button>
        ))}
      </div>

      {preset === "personalizado" ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-mut">De</span>
          <Input
            type="date"
            value={intervalo.inicio}
            max={hojeISO()}
            onChange={(e) => mudarData("inicio", e.target.value)}
            className="w-auto bg-panel border-line text-cream"
          />
          <span className="text-mut">até</span>
          <Input
            type="date"
            value={intervalo.fim}
            onChange={(e) => mudarData("fim", e.target.value)}
            className="w-auto bg-panel border-line text-cream"
          />
        </div>
      ) : (
        <p className="text-sm text-mut font-mono">
          {intervalo.inicio === intervalo.fim
            ? formatData(intervalo.inicio)
            : `${formatData(intervalo.inicio)} – ${formatData(intervalo.fim)}`}
        </p>
      )}
      {atualizando && <Loader2 className="size-4 animate-spin text-mut" />}
    </div>
  );
}

function Historico({
  movimentos,
  silos,
  titulo,
  onChange,
}: {
  movimentos: MovimentoRow[];
  silos: Silo[];
  titulo: string;
  onChange: () => void;
}) {
  const [tipo, setTipo] = useState<TipoMovimento | "todos">("todos");
  const [siloId, setSiloId] = useState<string>("todos");

  const filtrados = movimentos.filter(
    (m) => (tipo === "todos" || m.tipo === tipo) && (siloId === "todos" || m.silo_id === siloId),
  );

  const totais = tiposOrdem.map((t) => ({
    tipo: t,
    kg: filtrados.filter((m) => m.tipo === t).reduce((s, m) => s + Number(m.quantidade_kg), 0),
    n: filtrados.filter((m) => m.tipo === t).length,
  }));

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {totais.map(({ tipo: t, kg, n }) => {
          const info = movimentoInfo[t];
          return (
            <div key={t} className="rounded-xl bg-panel border border-line p-4">
              <p
                className={`text-xs uppercase tracking-wider flex items-center gap-1.5 ${info.textClass}`}
              >
                <info.Icon className="size-3.5" /> {info.nome}
              </p>
              <p className="font-mono text-2xl mt-2">{formatNumber(kg)}</p>
              <p className="text-xs text-mut">
                kg · {n} {n === 1 ? "lançamento" : "lançamentos"}
              </p>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl bg-panel border border-line p-5">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
          <div>
            <p className="font-display text-lg font-bold">Histórico de movimentações</p>
            <p className="text-xs text-mut">
              {titulo} · {filtrados.length} de {movimentos.length} registros
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div>
              <Label className="text-mut text-xs uppercase tracking-wider mb-1.5 block">Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoMovimento | "todos")}>
                <SelectTrigger className="w-44 bg-panel2 border-line text-cream">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-panel border-line text-cream">
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  {tiposOrdem.map((t) => (
                    <SelectItem key={t} value={t}>
                      {movimentoInfo[t].nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-mut text-xs uppercase tracking-wider mb-1.5 block">Silo</Label>
              <Select value={siloId} onValueChange={setSiloId}>
                <SelectTrigger className="w-36 bg-panel2 border-line text-cream">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-panel border-line text-cream">
                  <SelectItem value="todos">Todos os silos</SelectItem>
                  {silos.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <TabelaMovimentos movimentos={filtrados} silos={silos} onChange={onChange} detalhado />
      </div>
    </section>
  );
}

function TabelaMovimentos({
  movimentos,
  silos,
  onChange,
  detalhado = false,
}: {
  movimentos: MovimentoRow[];
  silos: Silo[];
  onChange: () => void;
  detalhado?: boolean;
}) {
  const doDelete = useServerFn(deleteMovimento);
  const [editando, setEditando] = useState<MovimentoRow | null>(null);
  const [excluindo, setExcluindo] = useState<MovimentoRow | null>(null);
  const [excluindoAgora, setExcluindoAgora] = useState(false);

  const confirmarExclusao = async () => {
    if (!excluindo) return;
    setExcluindoAgora(true);
    try {
      await doDelete({ data: { tipo: excluindo.tipo, id: excluindo.id } });
      toast.success("Movimentação excluída", {
        description: "O estoque do silo foi corrigido.",
      });
      setExcluindo(null);
      onChange();
    } catch (err) {
      toast.error("Erro ao excluir", {
        description: err instanceof Error ? err.message : "Tente novamente.",
      });
    } finally {
      setExcluindoAgora(false);
    }
  };

  const th = "text-mut text-xs uppercase tracking-wider";

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-line hover:bg-transparent">
              <TableHead className={th}>Data/hora</TableHead>
              <TableHead className={th}>Operação</TableHead>
              <TableHead className={`${th} text-right`}>Tipo</TableHead>
              <TableHead className={`${th} text-right`}>Quantidade</TableHead>
              {detalhado && <TableHead className={th}>Observação</TableHead>}
              <TableHead className={`${th} text-right`}>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movimentos.length === 0 ? (
              <TableRow className="border-line/60 hover:bg-transparent">
                <TableCell colSpan={detalhado ? 6 : 5} className="text-center text-mut py-8">
                  Nenhum movimento registrado no período.
                </TableCell>
              </TableRow>
            ) : (
              movimentos.map((m) => {
                const info = movimentoInfo[m.tipo];
                return (
                  <TableRow key={`${m.tipo}-${m.id}`} className="border-line/60 hover:bg-panel2/50">
                    <TableCell className="font-mono text-mut py-3 whitespace-nowrap">
                      {formatDataHora(m.data_hora)}
                    </TableCell>
                    <TableCell className="font-sans text-cream py-3 whitespace-nowrap">
                      {info.nome} · {m.silo_nome ?? "Silo"}
                    </TableCell>
                    <TableCell className="text-right py-3">
                      <span className={`inline-flex items-center gap-1 ${info.textClass}`}>
                        <info.Icon className="size-3.5" /> {info.label}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-right py-3 whitespace-nowrap">
                      {info.sign}
                      {formatNumber(Number(m.quantidade_kg))} kg
                    </TableCell>
                    {detalhado && (
                      <TableCell
                        className="text-mut py-3 max-w-xs truncate"
                        title={m.observacao ?? undefined}
                      >
                        {m.observacao ?? "—"}
                      </TableCell>
                    )}
                    <TableCell className="text-right py-3 whitespace-nowrap">
                      <button
                        onClick={() => setEditando(m)}
                        className="p-1.5 rounded-md text-mut hover:text-sil hover:bg-panel2"
                        aria-label="Editar"
                        title="Editar"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => setExcluindo(m)}
                        className="p-1.5 rounded-md text-mut hover:text-res hover:bg-panel2"
                        aria-label="Excluir"
                        title="Excluir"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {editando && (
        <EditarDialog
          movimento={editando}
          silos={silos}
          onClose={() => setEditando(null)}
          onSaved={() => {
            setEditando(null);
            onChange();
          }}
        />
      )}

      <AlertDialog open={!!excluindo} onOpenChange={(open) => !open && setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir movimentação?</AlertDialogTitle>
            <AlertDialogDescription>
              {excluindo && (
                <>
                  {movimentoInfo[excluindo.tipo].nome} · {excluindo.silo_nome ?? "Silo"} ·{" "}
                  {formatNumber(Number(excluindo.quantidade_kg))} kg em{" "}
                  {formatDataHora(excluindo.data_hora)}. O estoque do silo será corrigido. Essa ação
                  não pode ser desfeita.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluindoAgora}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmarExclusao();
              }}
              disabled={excluindoAgora}
              className="bg-res text-white hover:bg-res/90"
            >
              {excluindoAgora && <Loader2 className="size-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function EditarDialog({
  movimento,
  silos,
  onClose,
  onSaved,
}: {
  movimento: MovimentoRow;
  silos: Silo[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const doUpdate = useServerFn(updateMovimento);
  const [siloId, setSiloId] = useState(movimento.silo_id ?? silos[0]?.id ?? "");
  const [quantidade, setQuantidade] = useState(String(Number(movimento.quantidade_kg)));
  const [dataHora, setDataHora] = useState(isoParaInput(movimento.data_hora));
  const [observacao, setObservacao] = useState(movimento.observacao ?? "");
  const [salvando, setSalvando] = useState(false);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siloId || !quantidade || !dataHora) return;
    setSalvando(true);
    try {
      await doUpdate({
        data: {
          tipo: movimento.tipo,
          id: movimento.id,
          silo_id: siloId,
          quantidade_kg: Number(quantidade),
          data_hora: inputParaISO(dataHora),
          observacao: observacao || undefined,
        },
      });
      toast.success("Movimentação atualizada", {
        description: "O estoque do silo foi recalculado.",
      });
      onSaved();
    } catch (err) {
      toast.error("Erro ao salvar", {
        description: err instanceof Error ? err.message : "Tente novamente.",
      });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar {movimentoInfo[movimento.tipo].nome.toLowerCase()}</DialogTitle>
          <DialogDescription>
            Ao salvar, o efeito antigo no estoque é desfeito e o novo é aplicado.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={salvar} className="space-y-4">
          <div>
            <Label className="text-mut text-xs uppercase tracking-wider mb-2 block">Silo</Label>
            <Select value={siloId} onValueChange={setSiloId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {silos.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nome} · {s.produto ?? "—"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-mut text-xs uppercase tracking-wider mb-2 block">
                Quantidade (kg)
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-mut text-xs uppercase tracking-wider mb-2 block">
                Data/hora
              </Label>
              <Input
                type="datetime-local"
                value={dataHora}
                onChange={(e) => setDataHora(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label className="text-mut text-xs uppercase tracking-wider mb-2 block">
              Observação
            </Label>
            <Input value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={salvando}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={salvando || !siloId || !quantidade || !dataHora}
              className="bg-sil text-white hover:bg-sil/90"
            >
              {salvando && <Loader2 className="size-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LancamentoForm({ silos, onSuccess }: { silos: Silo[]; onSuccess: () => void }) {
  const criar = {
    producao: useServerFn(createProducao),
    carregamento: useServerFn(createCarregamento),
    reprocesso: useServerFn(createReprocesso),
    residuo: useServerFn(createResiduo),
  };

  const [tipo, setTipo] = useState<TipoMovimento>("producao");
  const [siloId, setSiloId] = useState<string>(silos[0]?.id ?? "");
  const [quantidade, setQuantidade] = useState<string>("");
  const [dataHora, setDataHora] = useState<string>("");
  const [observacao, setObservacao] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mensagens: Record<TipoMovimento, [string, string]> = {
    producao: ["Produção registrada", `${quantidade} kg de germen entraram no silo.`],
    carregamento: ["Carregamento registrado", `${quantidade} kg retirados do silo.`],
    reprocesso: ["Reprocesso registrado", `${quantidade} kg retornaram ao silo para reprocesso.`],
    residuo: ["Resíduo registrado", `${quantidade} kg de resíduo descartados.`],
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siloId || !quantidade) return;

    setIsSubmitting(true);
    try {
      await criar[tipo]({
        data: {
          silo_id: siloId,
          quantidade_kg: Number(quantidade),
          data_hora: dataHora ? inputParaISO(dataHora) : undefined,
          observacao: observacao || undefined,
        },
      });
      const [titulo, descricao] = mensagens[tipo];
      toast.success(titulo, { description: descricao });

      setQuantidade("");
      setObservacao("");
      onSuccess();
    } catch (err) {
      toast.error("Erro ao registrar", {
        description: err instanceof Error ? err.message : "Tente novamente.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const botoes: [TipoMovimento, string, typeof ArrowDownLeft, string][] = [
    ["producao", "Produção", ArrowDownLeft, "bg-pro"],
    ["carregamento", "Carreg.", ArrowUpRight, "bg-car"],
    ["reprocesso", "Reproc.", RefreshCw, "bg-rep"],
    ["residuo", "Resíduo", Trash2, "bg-res"],
  ];

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
      <div className="md:col-span-1">
        <Label className="text-mut text-xs uppercase tracking-wider mb-2 block">Tipo</Label>
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-line bg-panel2 p-1">
          {botoes.map(([t, texto, Icon, cor]) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className={`px-2 py-2 text-sm rounded-md font-medium transition-colors flex items-center justify-center gap-1.5 ${
                tipo === t ? `${cor} text-white` : "text-mut hover:text-cream"
              }`}
            >
              <Icon className="size-4" /> {texto}
            </button>
          ))}
        </div>
      </div>

      <div className="md:col-span-1">
        <Label className="text-mut text-xs uppercase tracking-wider mb-2 block">Silo</Label>
        <Select value={siloId} onValueChange={setSiloId}>
          <SelectTrigger className="bg-panel2 border-line text-cream focus:ring-sil">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent className="bg-panel border-line text-cream">
            {silos.map((s) => (
              <SelectItem key={s.id} value={s.id} className="focus:bg-panel2 focus:text-cream">
                {s.nome} · {s.produto ?? "—"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="md:col-span-1">
        <Label className="text-mut text-xs uppercase tracking-wider mb-2 block">
          Quantidade (kg)
        </Label>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
          placeholder="0,00"
          className="bg-panel2 border-line text-cream placeholder:text-mut focus-visible:ring-sil"
        />
      </div>

      <div className="md:col-span-1">
        <Label className="text-mut text-xs uppercase tracking-wider mb-2 block">Data/hora</Label>
        <Input
          type="datetime-local"
          value={dataHora}
          onChange={(e) => setDataHora(e.target.value)}
          title="Deixe em branco para usar o horário atual"
          className="bg-panel2 border-line text-cream focus-visible:ring-sil"
        />
      </div>

      <div className="md:col-span-1">
        <Label className="text-mut text-xs uppercase tracking-wider mb-2 block">Observação</Label>
        <Input
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Lote, frete, cliente..."
          className="bg-panel2 border-line text-cream placeholder:text-mut focus-visible:ring-sil"
        />
      </div>

      <div className="md:col-span-1">
        <Button
          type="submit"
          disabled={isSubmitting || !siloId || !quantidade}
          className="w-full bg-sil text-ink hover:bg-sil/90 font-semibold disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Package className="size-4" />
          )}
          Lançar
        </Button>
      </div>
      <p className="md:col-span-6 -mt-2 text-xs text-mut">
        Data/hora em branco = agora. Preencha para lançar movimentações de dias anteriores.
      </p>
    </form>
  );
}

function BarraAcumulado({
  label,
  valor,
  pct,
  cor,
}: {
  label: string;
  valor: number;
  pct: number;
  cor: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-mut">{label}</span>
        <span className="font-mono">{formatNumber(valor)} kg</span>
      </div>
      <div className="h-2.5 rounded-full bg-panel2 overflow-hidden">
        <div
          className={`h-full rounded-full ${cor} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function GlowCard({
  color,
  children,
}: {
  color: "sil" | "car" | "pro" | "rep" | "res";
  children: React.ReactNode;
}) {
  const glowClass = {
    sil: "before:bg-sil",
    car: "before:bg-car",
    pro: "before:bg-pro",
    rep: "before:bg-rep",
    res: "before:bg-res",
  }[color];

  return (
    <div className={`relative rounded-2xl bg-panel border border-line p-5 glow ${glowClass}`}>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function formatNumber(n: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function percentOf(part?: number, total?: number) {
  if (!part || !total || total === 0) return 0;
  return Math.min(100, Math.round((part / total) * 100));
}

function rendimento(carregado?: number, produzido?: number) {
  if (!carregado || !produzido || produzido === 0) return "0%";
  return `${((carregado / produzido) * 100).toFixed(1).replace(".", ",")}%`;
}

function labelPeriodo(preset: Preset, intervalo: Intervalo) {
  if (preset === "diario") return "hoje";
  if (preset === "semanal") return "semana";
  if (preset === "mensal") return "mês";
  return `${formatData(intervalo.inicio)} – ${formatData(intervalo.fim)}`;
}
