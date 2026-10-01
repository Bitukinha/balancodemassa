// Cliente Postgres (Neon) para uso exclusivo em server functions.
// Nunca importar diretamente em arquivos que também rodam no cliente —
// importe dinamicamente dentro do handler, como em balanco.functions.ts.
import { neon } from "@neondatabase/serverless";

function createSql() {
  const DATABASE_URL = process.env["DATABASE_URL"];
  if (!DATABASE_URL) {
    throw new Error("Missing DATABASE_URL environment variable.");
  }
  return neon(DATABASE_URL);
}

type Sql = ReturnType<typeof createSql>;

let _sql: Sql | undefined;
const getSql = () => (_sql ??= createSql());

// Criado na primeira consulta; também expõe sql.query e sql.transaction
export const sql: Sql = new Proxy(((...args: Parameters<Sql>) => getSql()(...args)) as Sql, {
  get(_target, prop) {
    const value = Reflect.get(getSql(), prop);
    return typeof value === "function" ? value.bind(getSql()) : value;
  },
});
