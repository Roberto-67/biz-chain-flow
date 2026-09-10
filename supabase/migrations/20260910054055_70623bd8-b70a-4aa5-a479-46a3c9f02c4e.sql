CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_index integer NOT NULL,
  order_id text NOT NULL,
  customer text NOT NULL,
  email text,
  model_id text NOT NULL,
  model_name text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal integer NOT NULL DEFAULT 0,
  tax integer NOT NULL DEFAULT 0,
  delivery integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  delivery_address text,
  delivery_lat double precision,
  delivery_lng double precision,
  delivery_eta_days integer,
  block_timestamp bigint NOT NULL,
  nonce integer NOT NULL,
  previous_hash text NOT NULL,
  hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view orders" ON public.orders FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can place an order" ON public.orders FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE INDEX orders_block_index_idx ON public.orders (block_index);