-- Store face descriptors for face recognition login
CREATE TABLE public.face_descriptors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  descriptor jsonb NOT NULL,
  label text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.face_descriptors ENABLE ROW LEVEL SECURITY;

-- Users can view their own face descriptor
CREATE POLICY "Users can view own face descriptor"
  ON public.face_descriptors FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own face descriptor
CREATE POLICY "Users can insert own face descriptor"
  ON public.face_descriptors FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own face descriptor
CREATE POLICY "Users can update own face descriptor"
  ON public.face_descriptors FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete their own face descriptor
CREATE POLICY "Users can delete own face descriptor"
  ON public.face_descriptors FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Allow anonymous read for face login (need to match face against all descriptors)
CREATE POLICY "Anyone can read face descriptors for login"
  ON public.face_descriptors FOR SELECT TO anon
  USING (true);