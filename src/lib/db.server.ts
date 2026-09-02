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

let _sql: ReturnType<typeof createSql> | undefined;

export const sql: ReturnType<typeof createSql> = ((
  ...args: Parameters<ReturnType<typeof createSql>>
) => {
  if (!_sql) _sql = createSql();
  return _sql(...args);
}) as ReturnType<typeof createSql>;
