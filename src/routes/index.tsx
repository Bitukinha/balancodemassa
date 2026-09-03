import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Loader2,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Package,
  RefreshCw,
  Trash2,
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
  getSilos,
  getCarregamentos,
  getProducoes,
  getReprocessos,
  getResiduos,
  getResumo,
  createCarregamento,
  createProducao,
  createReprocesso,
  createResiduo,
} from "@/lib/balanco.functions";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Nutrimilho · Balanço de Massa" },
      {
        name: "description",
        content:
          "Controle operacional de silos, carregamentos e produção de germen com visões diária, semanal e mensal.",
      },
      { property: "og:title", content: "Nutrimilho · Balanço de Massa" },
      {
        property: "og:description",
        content:
          "Controle operacional de silos, carregamentos e produção de germen com visões diária, semanal e mensal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: async ({ context }) => {
    const periodo = "diario" as const;
    await Promise.all([
      context.queryClient.ensureQueryData({
        queryKey: ["silos"],
        queryFn: () => getSilos(),
      }),
      context.queryClient.ensureQueryData({
        queryKey: ["resumo", periodo],
        queryFn: () => getResumo({ data: { periodo } }),
      }),
      context.queryClient.ensureQueryData({
        queryKey: ["carregamentos", periodo],
        queryFn: () => getCarregamentos({ data: { periodo } }),
      }),
      context.queryClient.ensureQueryData({
        queryKey: ["producoes", periodo],
        queryFn: () => getProducoes({ data: { periodo } }),
      }),
      context.queryClient.ensureQueryData({
        queryKey: ["reprocessos", periodo],
        queryFn: () => getReprocessos({ data: { periodo } }),
      }),
      context.queryClient.ensureQueryData({
        queryKey: ["residuos", periodo],
        queryFn: () => getResiduos({ data: { periodo } }),
      }),
    ]);
  },
});

type Periodo = "diario" | "semanal" | "mensal";
type TipoMovimento = "carregamento" | "producao" | "reprocesso" | "residuo";

const movimentoInfo: Record<
  TipoMovimento,
  { label: string; Icon: typeof ArrowDownLeft; sign: "+" | "−"; textClass: string }
> = {
  carregamento: { label: "Entrada", Icon: ArrowDownLeft, sign: "+", textClass: "text-car" },
  producao: { label: "Saída", Icon: ArrowUpRight, sign: "−", textClass: "text-pro" },
  reprocesso: { label: "Reprocesso", Icon: RefreshCw, sign: "+", textClass: "text-rep" },
  residuo: { label: "Resíduo", Icon: Trash2, sign: "−", textClass: "text-res" },
};

function Index() {
  const queryClient = useQueryClient();
  const [periodo, setPeriodo] = useState<Periodo>("diario");

  const { data: silos = [] } = useSuspenseQuery({
    queryKey: ["silos"],
    queryFn: () => getSilos(),
  });

  const { data: resumo } = useSuspenseQuery({
    queryKey: ["resumo", periodo],
    queryFn: () => getResumo({ data: { periodo } }),
  });

  const { data: carregamentos = [] } = useSuspenseQuery({
    queryKey: ["carregamentos", periodo],
    queryFn: () => getCarregamentos({ data: { periodo } }),
  });

  const { data: producoes = [] } = useSuspenseQuery({
    queryKey: ["producoes", periodo],
    queryFn: () => getProducoes({ data: { periodo } }),
  });

  const { data: reprocessos = [] } = useSuspenseQuery({
    queryKey: ["reprocessos", periodo],
    queryFn: () => getReprocessos({ data: { periodo } }),
  });

  const { data: residuos = [] } = useSuspenseQuery({
    queryKey: ["residuos", periodo],
    queryFn: () => getResiduos({ data: { periodo } }),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["silos"] });
    queryClient.invalidateQueries({ queryKey: ["resumo", periodo] });
    queryClient.invalidateQueries({ queryKey: ["carregamentos", periodo] });
    queryClient.invalidateQueries({ queryKey: ["producoes", periodo] });
    queryClient.invalidateQueries({ queryKey: ["reprocessos", periodo] });
    queryClient.invalidateQueries({ queryKey: ["residuos", periodo] });
  };

  const movimentos = [
    ...carregamentos.map((c) => ({
      id: c.id,
      tipo: "carregamento" as const,
      nome: `Carregamento · ${c.silo_nome ?? "Silo"}`,
      data: c.data_hora,
      quantidade: Number(c.quantidade_kg),
      observacao: c.observacao,
    })),
    ...producoes.map((p) => ({
      id: p.id,
      tipo: "producao" as const,
      nome: `Produção germen · ${p.silo_nome ?? "Silo"}`,
      data: p.data_hora,
      quantidade: Number(p.quantidade_kg),
      observacao: p.observacao,
    })),
    ...reprocessos.map((r) => ({
      id: r.id,
      tipo: "reprocesso" as const,
      nome: `Reprocesso · ${r.silo_nome ?? "Silo"}`,
      data: r.data_hora,
      quantidade: Number(r.quantidade_kg),
      observacao: r.observacao,
    })),
    ...residuos.map((r) => ({
      id: r.id,
      tipo: "residuo" as const,
      nome: `Resíduo · ${r.silo_nome ?? "Silo"}`,
      data: r.data_hora,
      quantidade: Number(r.quantidade_kg),
      observacao: r.observacao,
    })),
  ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  const totalReprocessado = resumo?.totalReprocessado ?? 0;
  const totalResiduo = resumo?.totalResiduo ?? 0;

  return (
    <div className="min-h-screen bg-ink text-cream font-sans antialiased">
      <div className="h-1 w-full flex">
        <div className="flex-1 bg-sil" />
        <div className="flex-1 bg-car" />
        <div className="flex-1 bg-pro" />
        <div className="flex-1 bg-rep" />
        <div className="flex-1 bg-res" />
      </div>

      <header className="max-w-6xl mx-auto px-5 pt-8 pb-6 flex flex-wrap items-end gap-6 justify-between border-b border-line">
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
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-line bg-panel p-1">
            {(["diario", "semanal", "mensal"] as Periodo[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${
                  periodo === p ? "bg-sil text-white" : "text-mut hover:text-cream"
                }`}
              >
                {p === "diario" ? "Diário" : p === "semanal" ? "Semanal" : "Mensal"}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-8 space-y-8">
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <GlowCard color="sil">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.15em] text-sil">Nível dos silos</p>
              <span className="size-2.5 rounded-full bg-sil shadow-[0_0_10px_#2f7d34]" />
            </div>
            <p className="font-mono text-4xl mt-3">{formatNumber(resumo?.estoqueAtual ?? 0)}</p>
            <p className="text-mut text-sm">kg · {silos.length} silos</p>
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

          <GlowCard color="car">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.15em] text-car">Carregado</p>
              <span className="size-2.5 rounded-full bg-car shadow-[0_0_10px_#f0a911]" />
            </div>
            <p className="font-mono text-4xl mt-3">{formatNumber(resumo?.totalCarregado ?? 0)}</p>
            <p className="text-mut text-sm">kg no período</p>
            <div className="mt-4 h-2 rounded-full bg-panel2 overflow-hidden">
              <div
                className="h-full rounded-full bg-car transition-all duration-700"
                style={{ width: `${percentOf(resumo?.totalCarregado, resumo?.capacidadeTotal)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-mut">Entrada de massa</p>
          </GlowCard>

          <GlowCard color="pro">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.15em] text-pro">Produzido Germen</p>
              <span className="size-2.5 rounded-full bg-pro shadow-[0_0_10px_#e8622c]" />
            </div>
            <p className="font-mono text-4xl mt-3">{formatNumber(resumo?.totalProduzido ?? 0)}</p>
            <p className="text-mut text-sm">kg no período</p>
            <div className="mt-4 h-2 rounded-full bg-panel2 overflow-hidden">
              <div
                className="h-full rounded-full bg-pro transition-all duration-700"
                style={{ width: `${percentOf(resumo?.totalProduzido, resumo?.totalCarregado)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-mut">
              Rendimento {rendimento(resumo?.totalProduzido, resumo?.totalCarregado)} sobre carga
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
            <div className="flex items-center justify-between mb-4">
              <p className="font-display text-lg font-bold">
                Movimento de massa · {labelPeriodo(periodo)}
              </p>
              <p className="text-xs text-mut font-mono" suppressHydrationWarning>
                {format(new Date(), "dd·MM·yyyy")}
              </p>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-line hover:bg-transparent">
                    <TableHead className="text-mut text-xs uppercase tracking-wider">
                      Operação
                    </TableHead>
                    <TableHead className="text-mut text-xs uppercase tracking-wider text-right">
                      Tipo
                    </TableHead>
                    <TableHead className="text-mut text-xs uppercase tracking-wider text-right">
                      Quantidade
                    </TableHead>
                    <TableHead className="text-mut text-xs uppercase tracking-wider text-right">
                      Horário
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimentos.length === 0 ? (
                    <TableRow className="border-line/60 hover:bg-transparent">
                      <TableCell colSpan={4} className="text-center text-mut py-8">
                        Nenhum movimento registrado no período.
                      </TableCell>
                    </TableRow>
                  ) : (
                    movimentos.map((m) => {
                      const info = movimentoInfo[m.tipo];
                      return (
                        <TableRow key={m.id} className="border-line/60 hover:bg-panel2/50">
                          <TableCell className="font-sans text-cream py-3">{m.nome}</TableCell>
                          <TableCell className="text-right py-3">
                            <span className={`inline-flex items-center gap-1 ${info.textClass}`}>
                              <info.Icon className="size-3.5" /> {info.label}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-right py-3">
                            {info.sign}
                            {formatNumber(m.quantidade)} kg
                          </TableCell>
                          <TableCell className="font-mono text-right text-mut py-3">
                            {format(new Date(m.data), "HH:mm", { locale: ptBR })}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="rounded-2xl bg-panel border border-line p-5">
            <p className="font-display text-lg mb-4 font-bold">Acumulado do período</p>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-mut">Carregado</span>
                  <span className="font-mono">{formatNumber(resumo?.totalCarregado ?? 0)} kg</span>
                </div>
                <div className="h-2.5 rounded-full bg-panel2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-car transition-all duration-700"
                    style={{
                      width: `${percentOf(resumo?.totalCarregado, resumo?.capacidadeTotal)}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-mut">Germen</span>
                  <span className="font-mono">{formatNumber(resumo?.totalProduzido ?? 0)} kg</span>
                </div>
                <div className="h-2.5 rounded-full bg-panel2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-pro transition-all duration-700"
                    style={{
                      width: `${percentOf(resumo?.totalProduzido, resumo?.capacidadeTotal)}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-mut">Silos finais</span>
                  <span className="font-mono">{formatNumber(resumo?.estoqueAtual ?? 0)} kg</span>
                </div>
                <div className="h-2.5 rounded-full bg-panel2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-sil transition-all duration-700"
                    style={{ width: `${resumo?.percentualOcupacao ?? 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-mut">Reprocesso</span>
                  <span className="font-mono">{formatNumber(totalReprocessado)} kg</span>
                </div>
                <div className="h-2.5 rounded-full bg-panel2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-rep transition-all duration-700"
                    style={{ width: `${percentOf(totalReprocessado, resumo?.totalProduzido)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-mut">Resíduo</span>
                  <span className="font-mono">{formatNumber(totalResiduo)} kg</span>
                </div>
                <div className="h-2.5 rounded-full bg-panel2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-res transition-all duration-700"
                    style={{ width: `${percentOf(totalResiduo, resumo?.totalProduzido)}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-line rounded-xl bg-panel2 p-4 -mx-1">
              <p className="text-xs text-mut">Balanço líquido</p>
              <p
                className={`font-mono text-2xl mt-1 ${(resumo?.balanco ?? 0) >= 0 ? "text-car" : "text-pro"}`}
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
                Registre carregamento, produção, reprocesso ou resíduo
              </p>
            </div>
          </div>
          <LancamentoForm silos={silos} onSuccess={refresh} />
        </section>
      </main>
    </div>
  );
}

function LancamentoForm({
  silos,
  onSuccess,
}: {
  silos: { id: string; nome: string; produto: string | null }[];
  onSuccess: () => void;
}) {
  const doCreateCarregamento = useServerFn(createCarregamento);
  const doCreateProducao = useServerFn(createProducao);
  const doCreateReprocesso = useServerFn(createReprocesso);
  const doCreateResiduo = useServerFn(createResiduo);

  const [tipo, setTipo] = useState<TipoMovimento>("carregamento");
  const [siloId, setSiloId] = useState<string>(silos[0]?.id ?? "");
  const [quantidade, setQuantidade] = useState<string>("");
  const [observacao, setObservacao] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siloId || !quantidade) return;

    setIsSubmitting(true);
    try {
      const payload = {
        silo_id: siloId,
        quantidade_kg: Number(quantidade),
        observacao: observacao || undefined,
      };

      if (tipo === "carregamento") {
        await doCreateCarregamento({ data: payload });
        toast.success("Carregamento registrado", {
          description: `${quantidade} kg adicionados ao silo.`,
        });
      } else if (tipo === "producao") {
        await doCreateProducao({ data: payload });
        toast.success("Produção registrada", {
          description: `${quantidade} kg de germen produzidos.`,
        });
      } else if (tipo === "reprocesso") {
        await doCreateReprocesso({ data: payload });
        toast.success("Reprocesso registrado", {
          description: `${quantidade} kg retornaram ao silo para reprocesso.`,
        });
      } else {
        await doCreateResiduo({ data: payload });
        toast.success("Resíduo registrado", {
          description: `${quantidade} kg de resíduo descartados.`,
        });
      }

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

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
      <div className="md:col-span-1">
        <Label className="text-mut text-xs uppercase tracking-wider mb-2 block">Tipo</Label>
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-line bg-panel2 p-1">
          <button
            type="button"
            onClick={() => setTipo("carregamento")}
            className={`px-3 py-2 text-sm rounded-md font-medium transition-colors flex items-center justify-center gap-2 ${
              tipo === "carregamento" ? "bg-car text-white" : "text-mut hover:text-cream"
            }`}
          >
            <ArrowDownLeft className="size-4" /> Carreg.
          </button>
          <button
            type="button"
            onClick={() => setTipo("producao")}
            className={`px-3 py-2 text-sm rounded-md font-medium transition-colors flex items-center justify-center gap-2 ${
              tipo === "producao" ? "bg-pro text-white" : "text-mut hover:text-cream"
            }`}
          >
            <ArrowUpRight className="size-4" /> Produção
          </button>
          <button
            type="button"
            onClick={() => setTipo("reprocesso")}
            className={`px-3 py-2 text-sm rounded-md font-medium transition-colors flex items-center justify-center gap-2 ${
              tipo === "reprocesso" ? "bg-rep text-white" : "text-mut hover:text-cream"
            }`}
          >
            <RefreshCw className="size-4" /> Reproc.
          </button>
          <button
            type="button"
            onClick={() => setTipo("residuo")}
            className={`px-3 py-2 text-sm rounded-md font-medium transition-colors flex items-center justify-center gap-2 ${
              tipo === "residuo" ? "bg-res text-white" : "text-mut hover:text-cream"
            }`}
          >
            <Trash2 className="size-4" /> Resíduo
          </button>
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
        <Label className="text-mut text-xs uppercase tracking-wider mb-2 block">Observação</Label>
        <Input
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Lote, frete, produtor..."
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
    </form>
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

function rendimento(produzido?: number, carregado?: number) {
  if (!produzido || !carregado || carregado === 0) return "0%";
  return `${((produzido / carregado) * 100).toFixed(1).replace(".", ",")}%`;
}

function labelPeriodo(p: Periodo) {
  if (p === "diario") return "hoje";
  if (p === "semanal") return "semana";
  return "mês";
}
