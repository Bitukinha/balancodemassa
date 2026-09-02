-- Esquema do balanço de massa (Postgres / Neon).
-- Aplique com: node db/migrate.mjs

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS silos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  capacidade_kg numeric NOT NULL DEFAULT 0,
  produto text,
  estoque_atual_kg numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS carregamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  silo_id uuid REFERENCES silos(id) ON DELETE SET NULL,
  quantidade_kg numeric NOT NULL DEFAULT 0,
  data_hora timestamp with time zone NOT NULL DEFAULT now(),
  observacao text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS producoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  silo_id uuid REFERENCES silos(id) ON DELETE SET NULL,
  quantidade_kg numeric NOT NULL DEFAULT 0,
  data_hora timestamp with time zone NOT NULL DEFAULT now(),
  observacao text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reprocessos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  silo_id uuid REFERENCES silos(id) ON DELETE SET NULL,
  quantidade_kg numeric NOT NULL DEFAULT 0,
  data_hora timestamp with time zone NOT NULL DEFAULT now(),
  observacao text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS residuos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  silo_id uuid REFERENCES silos(id) ON DELETE SET NULL,
  quantidade_kg numeric NOT NULL DEFAULT 0,
  data_hora timestamp with time zone NOT NULL DEFAULT now(),
  observacao text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS carregamentos_data_hora_idx ON carregamentos (data_hora DESC);
CREATE INDEX IF NOT EXISTS producoes_data_hora_idx ON producoes (data_hora DESC);
CREATE INDEX IF NOT EXISTS reprocessos_data_hora_idx ON reprocessos (data_hora DESC);
CREATE INDEX IF NOT EXISTS residuos_data_hora_idx ON residuos (data_hora DESC);

INSERT INTO silos (nome, capacidade_kg, produto, estoque_atual_kg)
SELECT * FROM (VALUES
  ('Silo 01', 4000, 'Milho', 3280),
  ('Silo 02', 4000, 'Milho', 2560),
  ('Silo 03', 4000, 'Soja', 1640),
  ('Silo 04', 4000, 'Soja', 1000)
) AS seed(nome, capacidade_kg, produto, estoque_atual_kg)
WHERE NOT EXISTS (SELECT 1 FROM silos);
