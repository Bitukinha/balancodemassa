// Aplica db/schema.sql contra o Postgres apontado por DATABASE_URL.
// Uso: node db/migrate.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Client } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL não definida. Configure o .env antes de rodar a migração.");
  process.exit(1);
}

const schemaPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "schema.sql");
const sql = readFileSync(schemaPath, "utf8");

const client = new Client(connectionString);

try {
  await client.connect();
  await client.query(sql);
  console.log("Schema aplicado com sucesso.");
} finally {
  await client.end();
}
