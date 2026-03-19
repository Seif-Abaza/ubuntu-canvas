
CREATE TABLE public.desktop_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('folder', 'note')),
  content text DEFAULT '',
  x integer NOT NULL DEFAULT 0,
  y integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.desktop_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own desktop items"
  ON public.desktop_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own desktop items"
  ON public.desktop_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own desktop items"
  ON public.desktop_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own desktop items"
  ON public.desktop_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_desktop_items_updated_at
  BEFORE UPDATE ON public.desktop_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
