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

## PWA

O app é instalável (manifest + service worker registrados em `src/routes/__root.tsx`).
O service worker (`public/sw.js`) só cacheia assets estáticos (js/css/imagens/fontes) —
nunca navegação nem chamadas de dados, para o balanço nunca mostrar números velhos.

Ícones em `public/` (icon-192, icon-512, icon-maskable-512, apple-touch-icon, favicon-32/48,
favicon.ico) e o logo do cabeçalho são gerados a partir de `scripts/assets/logo-nutrimilho.png`
com `bun run icons:generate` — troque esse arquivo-fonte para mudar o desenho.

## Deploy (Vercel)

O build (`vite build`) usa Nitro; o preset do servidor é escolhido automaticamente em
`vite.config.ts` — `vercel` quando a env `VERCEL` está setada (é o caso do build da própria
Vercel), `node-server` em qualquer outro lugar. Não precisa de `vercel.json`: basta importar o
repositório na Vercel, definir a env `DATABASE_URL` (connection string do Neon) nas configurações
do projeto, e deixar o Build Command padrão (`npm run build` / `bun run build`).
