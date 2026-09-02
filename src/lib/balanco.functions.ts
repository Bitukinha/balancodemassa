import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const supabaseImport = () => import("@/integrations/supabase/client.server");

const numberLike = z.union([
  z.number(),
  z.string().transform((v) => {
    const parsed = Number(v);
    if (Number.isNaN(parsed)) throw new Error("Valor numérico inválido");
    return parsed;
  }),
]);

// Schemas
const periodSchema = z.enum(["diario", "semanal", "mensal"]);

const createCarregamentoSchema = z.object({
  silo_id: z.string().uuid(),
  quantidade_kg: numberLike,
  data_hora: z.string().datetime().optional(),
  observacao: z.string().optional(),
});

const createProducaoSchema = z.object({
  silo_id: z.string().uuid(),
  quantidade_kg: numberLike,
  data_hora: z.string().datetime().optional(),
  observacao: z.string().optional(),
});

const createReprocessoSchema = z.object({
  silo_id: z.string().uuid(),
  quantidade_kg: numberLike,
  data_hora: z.string().datetime().optional(),
  observacao: z.string().optional(),
});

const createResiduoSchema = z.object({
  silo_id: z.string().uuid(),
  quantidade_kg: numberLike,
  data_hora: z.string().datetime().optional(),
  observacao: z.string().optional(),
});

// Helpers
function startOfPeriod(period: z.infer<typeof periodSchema>) {
  const now = new Date();
  if (period === "diario") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (period === "semanal") {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.getFullYear(), now.getMonth(), diff);
  }
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

// Server functions
export const getSilos = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await supabaseImport();
  const { data, error } = await supabaseAdmin.from("silos").select("*").order("nome");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getCarregamentos = createServerFn({ method: "GET" })
  .validator((data) => z.object({ periodo: periodSchema }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await supabaseImport();
    const start = startOfPeriod(data.periodo).toISOString();
    const { data: rows, error } = await supabaseAdmin
      .from("carregamentos")
      .select("*, silos(nome)")
      .gte("data_hora", start)
      .order("data_hora", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getProducoes = createServerFn({ method: "GET" })
  .validator((data) => z.object({ periodo: periodSchema }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await supabaseImport();
    const start = startOfPeriod(data.periodo).toISOString();
    const { data: rows, error } = await supabaseAdmin
      .from("producoes")
      .select("*, silos(nome)")
      .gte("data_hora", start)
      .order("data_hora", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getReprocessos = createServerFn({ method: "GET" })
  .validator((data) => z.object({ periodo: periodSchema }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await supabaseImport();
    const start = startOfPeriod(data.periodo).toISOString();
    const { data: rows, error } = await supabaseAdmin
      .from("reprocessos")
      .select("*, silos(nome)")
      .gte("data_hora", start)
      .order("data_hora", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getResiduos = createServerFn({ method: "GET" })
  .validator((data) => z.object({ periodo: periodSchema }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await supabaseImport();
    const start = startOfPeriod(data.periodo).toISOString();
    const { data: rows, error } = await supabaseAdmin
      .from("residuos")
      .select("*, silos(nome)")
      .gte("data_hora", start)
      .order("data_hora", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createCarregamento = createServerFn({ method: "POST" })
  .validator((data) => createCarregamentoSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await supabaseImport();
    const payload = {
      silo_id: data.silo_id,
      quantidade_kg: data.quantidade_kg,
      data_hora: data.data_hora ?? new Date().toISOString(),
      observacao: data.observacao ?? null,
    };
    const { data: row, error } = await supabaseAdmin
      .from("carregamentos")
      .insert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);

    // Atualiza estoque do silo
    const { data: silo } = await supabaseAdmin
      .from("silos")
      .select("estoque_atual_kg")
      .eq("id", data.silo_id)
      .single();
    if (silo) {
      await supabaseAdmin
        .from("silos")
        .update({ estoque_atual_kg: Number(silo.estoque_atual_kg) + Number(data.quantidade_kg) })
        .eq("id", data.silo_id);
    }

    return row;
  });

export const createProducao = createServerFn({ method: "POST" })
  .validator((data) => createProducaoSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await supabaseImport();
    const payload = {
      silo_id: data.silo_id,
      quantidade_kg: data.quantidade_kg,
      data_hora: data.data_hora ?? new Date().toISOString(),
      observacao: data.observacao ?? null,
    };
    const { data: row, error } = await supabaseAdmin
      .from("producoes")
      .insert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);

    // Atualiza estoque do silo
    const { data: silo } = await supabaseAdmin
      .from("silos")
      .select("estoque_atual_kg")
      .eq("id", data.silo_id)
      .single();
    if (silo) {
      await supabaseAdmin
        .from("silos")
        .update({ estoque_atual_kg: Math.max(0, Number(silo.estoque_atual_kg) - Number(data.quantidade_kg)) })
        .eq("id", data.silo_id);
    }

    return row;
  });

export const createReprocesso = createServerFn({ method: "POST" })
  .validator((data) => createReprocessoSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await supabaseImport();
    const payload = {
      silo_id: data.silo_id,
      quantidade_kg: data.quantidade_kg,
      data_hora: data.data_hora ?? new Date().toISOString(),
      observacao: data.observacao ?? null,
    };
    const { data: row, error } = await supabaseAdmin
      .from("reprocessos")
      .insert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);

    // Material reprocessado retorna ao estoque do silo
    const { data: silo } = await supabaseAdmin
      .from("silos")
      .select("estoque_atual_kg")
      .eq("id", data.silo_id)
      .single();
    if (silo) {
      await supabaseAdmin
        .from("silos")
        .update({ estoque_atual_kg: Number(silo.estoque_atual_kg) + Number(data.quantidade_kg) })
        .eq("id", data.silo_id);
    }

    return row;
  });

export const createResiduo = createServerFn({ method: "POST" })
  .validator((data) => createResiduoSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await supabaseImport();
    const payload = {
      silo_id: data.silo_id,
      quantidade_kg: data.quantidade_kg,
      data_hora: data.data_hora ?? new Date().toISOString(),
      observacao: data.observacao ?? null,
    };
    // Resíduo sai do processo — não retorna e não é descontado do estoque do silo
    const { data: row, error } = await supabaseAdmin
      .from("residuos")
      .insert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);

    return row;
  });

export const getResumo = createServerFn({ method: "GET" })
  .validator((data) => z.object({ periodo: periodSchema }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await supabaseImport();
    const start = startOfPeriod(data.periodo).toISOString();

    const [
      { data: carregamentos },
      { data: producoes },
      { data: reprocessos },
      { data: residuos },
      { data: silos },
    ] = await Promise.all([
      supabaseAdmin.from("carregamentos").select("quantidade_kg, data_hora").gte("data_hora", start),
      supabaseAdmin.from("producoes").select("quantidade_kg, data_hora").gte("data_hora", start),
      supabaseAdmin.from("reprocessos").select("quantidade_kg, data_hora").gte("data_hora", start),
      supabaseAdmin.from("residuos").select("quantidade_kg, data_hora").gte("data_hora", start),
      supabaseAdmin.from("silos").select("estoque_atual_kg, capacidade_kg"),
    ]);

    const totalCarregado = (carregamentos ?? []).reduce(
      (sum: number, c: { quantidade_kg: number }) => sum + Number(c.quantidade_kg),
      0,
    );
    const totalProduzido = (producoes ?? []).reduce(
      (sum: number, p: { quantidade_kg: number }) => sum + Number(p.quantidade_kg),
      0,
    );
    const totalReprocessado = (reprocessos ?? []).reduce(
      (sum: number, r: { quantidade_kg: number }) => sum + Number(r.quantidade_kg),
      0,
    );
    const totalResiduo = (residuos ?? []).reduce(
      (sum: number, r: { quantidade_kg: number }) => sum + Number(r.quantidade_kg),
      0,
    );
    const estoqueAtual = (silos ?? []).reduce(
      (sum: number, s: { estoque_atual_kg: number }) => sum + Number(s.estoque_atual_kg),
      0,
    );
    const capacidadeTotal = (silos ?? []).reduce(
      (sum: number, s: { capacidade_kg: number }) => sum + Number(s.capacidade_kg),
      0,
    );

    return {
      totalCarregado,
      totalProduzido,
      totalReprocessado,
      totalResiduo,
      estoqueAtual,
      capacidadeTotal,
      percentualOcupacao: capacidadeTotal > 0 ? Math.round((estoqueAtual / capacidadeTotal) * 100) : 0,
      balanco: totalCarregado - totalProduzido,
    };
  });
