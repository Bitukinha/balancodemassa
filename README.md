# Nutrimilho · Balanço de Massa

App de balanço de massa: controle de estoque nos silos, carregamentos e produção de germen, com visões diária, semanal e mensal — além do lançamento de reprocesso e resíduos gerados no processo.

Banco de dados: Postgres (Neon).

## Development

Requer Node.js e Bun.

```sh
git clone <this-repository-url>
cd <repository-name>
bun install
cp .env.example .env   # preencha DATABASE_URL com a connection string do Neon
bun run db:migrate     # cria as tabelas (silos, carregamentos, producoes, reprocessos, residuos)
bun run dev
```

Se `bun install` deixar pastas vazias em `node_modules` (comum em pastas sincronizadas pelo
OneDrive), use `npm install` / `npm run <script>` como alternativa.
