import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { TZ } from "@/lib/periodo";

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
const dataISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");
const intervaloSchema = z.object({ inicio: dataISO, fim: dataISO });

const tipoSchema = z.enum(["carregamento", "producao", "reprocesso", "residuo"]);
export type TipoMovimento = z.infer<typeof tipoSchema>;

const movimentoSchema = z.object({
  silo_id: z.string().uuid(),
  quantidade_kg: numberLike,
  data_hora: z.string().datetime({ offset: true }).optional(),
  observacao: z.string().optional(),
});

// Cada tipo vive na sua tabela e mexe no estoque do silo num sentido:
// produção e reprocesso entram (+), carregamento sai (−), resíduo não mexe.
const tabelas: Record<TipoMovimento, { tabela: string; efeito: 1 | -1 | 0 }> = {
  producao: { tabela: "producoes", efeito: 1 },
  carregamento: { tabela: "carregamentos", efeito: -1 },
  reprocesso: { tabela: "reprocessos", efeito: 1 },
  residuo: { tabela: "residuos", efeito: 0 },
};

// Tipos de retorno (o driver do Neon não tipa as linhas automaticamente)
type SiloRow = {
  id: string;
  nome: string;
  capacidade_kg: number;
  produto: string | null;
  estoque_atual_kg: number;
  created_at: string | null;
};

export type MovimentoRow = {
  id: string;
  tipo: TipoMovimento;
  silo_id: string | null;
  quantidade_kg: number;
  data_hora: string;
  observacao: string | null;
  created_at: string | null;
  silo_nome: string | null;
};

type MovimentoInsertRow = Omit<MovimentoRow, "silo_nome" | "tipo">;

// Filtro de período: datas inteiras no fuso de Brasília, fim inclusivo
const filtroPeriodo = (col: string) =>
  `${col} >= ($1::date::timestamp AT TIME ZONE '${TZ}') AND ${col} < (($2::date + 1)::timestamp AT TIME ZONE '${TZ}')`;

// Server functions
export const getSilos = createServerFn({ method: "GET" }).handler(async () => {
  const { sql } = await dbImport();
  const rows = await sql`SELECT * FROM silos ORDER BY nome`;
  return rows as SiloRow[];
});

export const getMovimentos = createServerFn({ method: "GET" })
  .validator((data) => intervaloSchema.parse(data))
  .handler(async ({ data }) => {
    const { sql } = await dbImport();
    const union = (Object.keys(tabelas) as TipoMovimento[])
      .map(
        (tipo) => `
          SELECT m.*, '${tipo}' AS tipo, s.nome AS silo_nome
          FROM ${tabelas[tipo].tabela} m
          LEFT JOIN silos s ON s.id = m.silo_id
          WHERE ${filtroPeriodo("m.data_hora")}`,
      )
      .join(" UNION ALL ");
    const rows = await sql.query(`${union} ORDER BY data_hora DESC, created_at DESC`, [
      data.inicio,
      data.fim,
    ]);
    return rows as MovimentoRow[];
  });

function criarMovimento(tipo: TipoMovimento) {
  return createServerFn({ method: "POST" })
    .validator((data) => movimentoSchema.parse(data))
    .handler(async ({ data }) => {
      const { sql } = await dbImport();
      const { tabela, efeito } = tabelas[tipo];
      const dataHora = data.data_hora ?? new Date().toISOString();
      const observacao = data.observacao ?? null;

      const [rows] = (await sql.transaction([
        sql.query(
          `INSERT INTO ${tabela} (silo_id, quantidade_kg, data_hora, observacao)
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [data.silo_id, data.quantidade_kg, dataHora, observacao],
        ),
        sql`
          UPDATE silos SET estoque_atual_kg = GREATEST(0, estoque_atual_kg + ${efeito * data.quantidade_kg})
          WHERE id = ${data.silo_id}
        `,
      ])) as [MovimentoInsertRow[], unknown];

      return rows[0];
    });
}

export const createProducao = criarMovimento("producao");
export const createCarregamento = criarMovimento("carregamento");
export const createReprocesso = criarMovimento("reprocesso");
export const createResiduo = criarMovimento("residuo");

const idSchema = z.object({ tipo: tipoSchema, id: z.string().uuid() });

async function buscarMovimento(tipo: TipoMovimento, id: string) {
  const { sql } = await dbImport();
  const rows = (await sql.query(`SELECT * FROM ${tabelas[tipo].tabela} WHERE id = $1`, [
    id,
  ])) as MovimentoInsertRow[];
  if (!rows[0]) throw new Error("Movimentação não encontrada");
  return rows[0];
}

// Editar desfaz o efeito antigo no estoque e aplica o novo (o silo pode mudar)
export const updateMovimento = createServerFn({ method: "POST" })
  .validator((data) => idSchema.merge(movimentoSchema).parse(data))
  .handler(async ({ data }) => {
    const { sql } = await dbImport();
    const { tabela, efeito } = tabelas[data.tipo];
    const antigo = await buscarMovimento(data.tipo, data.id);

    const [rows] = (await sql.transaction([
      sql.query(
        `UPDATE ${tabela}
         SET silo_id = $2, quantidade_kg = $3, data_hora = COALESCE($4, data_hora), observacao = $5
         WHERE id = $1 RETURNING *`,
        [
          data.id,
          data.silo_id,
          data.quantidade_kg,
          data.data_hora ?? null,
          data.observacao ?? null,
        ],
      ),
      sql`
        UPDATE silos SET estoque_atual_kg = GREATEST(0, estoque_atual_kg - ${efeito * Number(antigo.quantidade_kg)})
        WHERE id = ${antigo.silo_id}
      `,
      sql`
        UPDATE silos SET estoque_atual_kg = GREATEST(0, estoque_atual_kg + ${efeito * data.quantidade_kg})
        WHERE id = ${data.silo_id}
      `,
    ])) as [MovimentoInsertRow[], unknown, unknown];

    return rows[0];
  });

// Excluir desfaz o efeito do movimento no estoque do silo
export const deleteMovimento = createServerFn({ method: "POST" })
  .validator((data) => idSchema.parse(data))
  .handler(async ({ data }) => {
    const { sql } = await dbImport();
    const { tabela, efeito } = tabelas[data.tipo];
    const antigo = await buscarMovimento(data.tipo, data.id);

    await sql.transaction([
      sql.query(`DELETE FROM ${tabela} WHERE id = $1`, [data.id]),
      sql`
        UPDATE silos SET estoque_atual_kg = GREATEST(0, estoque_atual_kg - ${efeito * Number(antigo.quantidade_kg)})
        WHERE id = ${antigo.silo_id}
      `,
    ]);

    return { ok: true };
  });

export const getResumo = createServerFn({ method: "GET" })
  .validator((data) => intervaloSchema.parse(data))
  .handler(async ({ data }) => {
    const { sql } = await dbImport();
    const params = [data.inicio, data.fim];
    const total = (tabela: string) =>
      sql.query(
        `SELECT COALESCE(SUM(quantidade_kg), 0) AS total FROM ${tabela} WHERE ${filtroPeriodo("data_hora")}`,
        params,
      );

    type TotalRow = [{ total: string }];
    type EstoqueRow = [{ estoque: string; capacidade: string }];

    const [[carregado], [produzido], [reprocessado], [residuo], [estoque]] = (await Promise.all([
      total("carregamentos"),
      total("producoes"),
      total("reprocessos"),
      total("residuos"),
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
      // Positivo = acumulou nos silos (produziu mais do que carregou)
      balanco: totalProduzido - totalCarregado,
    };
  });
