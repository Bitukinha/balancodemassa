import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const dbImport = () => import("@/lib/db.server");

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

const movimentoSchema = z.object({
  silo_id: z.string().uuid(),
  quantidade_kg: numberLike,
  data_hora: z.string().datetime().optional(),
  observacao: z.string().optional(),
});

// Tipos de retorno (o driver do Neon não tipa as linhas automaticamente)
type SiloRow = {
  id: string;
  nome: string;
  capacidade_kg: number;
  produto: string | null;
  estoque_atual_kg: number;
  created_at: string | null;
};

type MovimentoRow = {
  id: string;
  silo_id: string | null;
  quantidade_kg: number;
  data_hora: string;
  observacao: string | null;
  created_at: string | null;
  silo_nome: string | null;
};

type MovimentoInsertRow = Omit<MovimentoRow, "silo_nome">;

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
  const { sql } = await dbImport();
  const rows = await sql`SELECT * FROM silos ORDER BY nome`;
  return rows as SiloRow[];
});

export const getCarregamentos = createServerFn({ method: "GET" })
  .validator((data) => z.object({ periodo: periodSchema }).parse(data))
  .handler(async ({ data }) => {
    const { sql } = await dbImport();
    const start = startOfPeriod(data.periodo).toISOString();
    const rows = await sql`
      SELECT c.*, s.nome AS silo_nome
      FROM carregamentos c
      LEFT JOIN silos s ON s.id = c.silo_id
      WHERE c.data_hora >= ${start}
      ORDER BY c.data_hora DESC
    `;
    return rows as MovimentoRow[];
  });

export const getProducoes = createServerFn({ method: "GET" })
  .validator((data) => z.object({ periodo: periodSchema }).parse(data))
  .handler(async ({ data }) => {
    const { sql } = await dbImport();
    const start = startOfPeriod(data.periodo).toISOString();
    const rows = await sql`
      SELECT p.*, s.nome AS silo_nome
      FROM producoes p
      LEFT JOIN silos s ON s.id = p.silo_id
      WHERE p.data_hora >= ${start}
      ORDER BY p.data_hora DESC
    `;
    return rows as MovimentoRow[];
  });

export const getReprocessos = createServerFn({ method: "GET" })
  .validator((data) => z.object({ periodo: periodSchema }).parse(data))
  .handler(async ({ data }) => {
    const { sql } = await dbImport();
    const start = startOfPeriod(data.periodo).toISOString();
    const rows = await sql`
      SELECT r.*, s.nome AS silo_nome
      FROM reprocessos r
      LEFT JOIN silos s ON s.id = r.silo_id
      WHERE r.data_hora >= ${start}
      ORDER BY r.data_hora DESC
    `;
    return rows as MovimentoRow[];
  });

export const getResiduos = createServerFn({ method: "GET" })
  .validator((data) => z.object({ periodo: periodSchema }).parse(data))
  .handler(async ({ data }) => {
    const { sql } = await dbImport();
    const start = startOfPeriod(data.periodo).toISOString();
    const rows = await sql`
      SELECT r.*, s.nome AS silo_nome
      FROM residuos r
      LEFT JOIN silos s ON s.id = r.silo_id
      WHERE r.data_hora >= ${start}
      ORDER BY r.data_hora DESC
    `;
    return rows as MovimentoRow[];
  });

export const createCarregamento = createServerFn({ method: "POST" })
  .validator((data) => movimentoSchema.parse(data))
  .handler(async ({ data }) => {
    const { sql } = await dbImport();
    const dataHora = data.data_hora ?? new Date().toISOString();
    const observacao = data.observacao ?? null;

    const rows = (await sql`
      INSERT INTO carregamentos (silo_id, quantidade_kg, data_hora, observacao)
      VALUES (${data.silo_id}, ${data.quantidade_kg}, ${dataHora}, ${observacao})
      RETURNING *
    `) as [MovimentoInsertRow];
    const row = rows[0];

    // Carregamento entra no silo
    await sql`
      UPDATE silos SET estoque_atual_kg = estoque_atual_kg + ${data.quantidade_kg}
      WHERE id = ${data.silo_id}
    `;

    return row;
  });

export const createProducao = createServerFn({ method: "POST" })
  .validator((data) => movimentoSchema.parse(data))
  .handler(async ({ data }) => {
    const { sql } = await dbImport();
    const dataHora = data.data_hora ?? new Date().toISOString();
    const observacao = data.observacao ?? null;

    const rows = (await sql`
      INSERT INTO producoes (silo_id, quantidade_kg, data_hora, observacao)
      VALUES (${data.silo_id}, ${data.quantidade_kg}, ${dataHora}, ${observacao})
      RETURNING *
    `) as [MovimentoInsertRow];
    const row = rows[0];

    // Produção de germen consome o silo
    await sql`
      UPDATE silos SET estoque_atual_kg = GREATEST(0, estoque_atual_kg - ${data.quantidade_kg})
      WHERE id = ${data.silo_id}
    `;

    return row;
  });

export const createReprocesso = createServerFn({ method: "POST" })
  .validator((data) => movimentoSchema.parse(data))
  .handler(async ({ data }) => {
    const { sql } = await dbImport();
    const dataHora = data.data_hora ?? new Date().toISOString();
    const observacao = data.observacao ?? null;

    const rows = (await sql`
      INSERT INTO reprocessos (silo_id, quantidade_kg, data_hora, observacao)
      VALUES (${data.silo_id}, ${data.quantidade_kg}, ${dataHora}, ${observacao})
      RETURNING *
    `) as [MovimentoInsertRow];
    const row = rows[0];

    // Material reprocessado retorna ao estoque do silo
    await sql`
      UPDATE silos SET estoque_atual_kg = estoque_atual_kg + ${data.quantidade_kg}
      WHERE id = ${data.silo_id}
    `;

    return row;
  });

export const createResiduo = createServerFn({ method: "POST" })
  .validator((data) => movimentoSchema.parse(data))
  .handler(async ({ data }) => {
    const { sql } = await dbImport();
    const dataHora = data.data_hora ?? new Date().toISOString();
    const observacao = data.observacao ?? null;

    // Resíduo sai do processo — não retorna e não é descontado do estoque do silo
    const rows = (await sql`
      INSERT INTO residuos (silo_id, quantidade_kg, data_hora, observacao)
      VALUES (${data.silo_id}, ${data.quantidade_kg}, ${dataHora}, ${observacao})
      RETURNING *
    `) as [MovimentoInsertRow];

    return rows[0];
  });

export const getResumo = createServerFn({ method: "GET" })
  .validator((data) => z.object({ periodo: periodSchema }).parse(data))
  .handler(async ({ data }) => {
    const { sql } = await dbImport();
    const start = startOfPeriod(data.periodo).toISOString();

    type TotalRow = [{ total: string }];
    type EstoqueRow = [{ estoque: string; capacidade: string }];

    const [[carregado], [produzido], [reprocessado], [residuo], [estoque]] = (await Promise.all([
      sql`SELECT COALESCE(SUM(quantidade_kg), 0) AS total FROM carregamentos WHERE data_hora >= ${start}`,
      sql`SELECT COALESCE(SUM(quantidade_kg), 0) AS total FROM producoes WHERE data_hora >= ${start}`,
      sql`SELECT COALESCE(SUM(quantidade_kg), 0) AS total FROM reprocessos WHERE data_hora >= ${start}`,
      sql`SELECT COALESCE(SUM(quantidade_kg), 0) AS total FROM residuos WHERE data_hora >= ${start}`,
      sql`SELECT COALESCE(SUM(estoque_atual_kg), 0) AS estoque, COALESCE(SUM(capacidade_kg), 0) AS capacidade FROM silos`,
    ])) as [TotalRow, TotalRow, TotalRow, TotalRow, EstoqueRow];

    const totalCarregado = Number(carregado.total);
    const totalProduzido = Number(produzido.total);
    const totalReprocessado = Number(reprocessado.total);
    const totalResiduo = Number(residuo.total);
    const estoqueAtual = Number(estoque.estoque);
    const capacidadeTotal = Number(estoque.capacidade);

    return {
      totalCarregado,
      totalProduzido,
      totalReprocessado,
      totalResiduo,
      estoqueAtual,
      capacidadeTotal,
      percentualOcupacao:
        capacidadeTotal > 0 ? Math.round((estoqueAtual / capacidadeTotal) * 100) : 0,
      balanco: totalCarregado - totalProduzido,
    };
  });
