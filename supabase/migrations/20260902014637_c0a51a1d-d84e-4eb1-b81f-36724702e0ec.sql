CREATE TABLE public.silos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  capacidade_kg numeric NOT NULL DEFAULT 0,
  produto text,
  estoque_atual_kg numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.silos TO authenticated;
GRANT ALL ON public.silos TO service_role;

ALTER TABLE public.silos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage silos"
ON public.silos FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE TABLE public.carregamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  silo_id uuid REFERENCES public.silos(id) ON DELETE SET NULL,
  quantidade_kg numeric NOT NULL DEFAULT 0,
  data_hora timestamp with time zone NOT NULL DEFAULT now(),
  observacao text,
  created_at timestamp with time zone DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.carregamentos TO authenticated;
GRANT ALL ON public.carregamentos TO service_role;

ALTER TABLE public.carregamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage carregamentos"
ON public.carregamentos FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE TABLE public.producoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  silo_id uuid REFERENCES public.silos(id) ON DELETE SET NULL,
  quantidade_kg numeric NOT NULL DEFAULT 0,
  data_hora timestamp with time zone NOT NULL DEFAULT now(),
  observacao text,
  created_at timestamp with time zone DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.producoes TO authenticated;
GRANT ALL ON public.producoes TO service_role;

ALTER TABLE public.producoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage producoes"
ON public.producoes FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

INSERT INTO public.silos (nome, capacidade_kg, produto, estoque_atual_kg) VALUES
('Silo 01', 4000, 'Milho', 3280),
('Silo 02', 4000, 'Milho', 2560),
('Silo 03', 4000, 'Soja', 1640),
('Silo 04', 4000, 'Soja', 1000);