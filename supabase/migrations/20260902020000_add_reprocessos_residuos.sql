CREATE TABLE public.reprocessos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  silo_id uuid REFERENCES public.silos(id) ON DELETE SET NULL,
  quantidade_kg numeric NOT NULL DEFAULT 0,
  data_hora timestamp with time zone NOT NULL DEFAULT now(),
  observacao text,
  created_at timestamp with time zone DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reprocessos TO authenticated;
GRANT ALL ON public.reprocessos TO service_role;

ALTER TABLE public.reprocessos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage reprocessos"
ON public.reprocessos FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE TABLE public.residuos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  silo_id uuid REFERENCES public.silos(id) ON DELETE SET NULL,
  quantidade_kg numeric NOT NULL DEFAULT 0,
  data_hora timestamp with time zone NOT NULL DEFAULT now(),
  observacao text,
  created_at timestamp with time zone DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.residuos TO authenticated;
GRANT ALL ON public.residuos TO service_role;

ALTER TABLE public.residuos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage residuos"
ON public.residuos FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
