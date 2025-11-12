-- Notes table enhancement for karuteens
-- This migration adds missing columns and sets up RLS for an existing notes table

-- Add missing columns if they don't exist
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS content text;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Set NOT NULL constraints for required columns
ALTER TABLE public.notes ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.notes ALTER COLUMN title SET NOT NULL;
ALTER TABLE public.notes ALTER COLUMN is_public SET NOT NULL;
ALTER TABLE public.notes ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.notes ALTER COLUMN updated_at SET NOT NULL;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON public.notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_is_public ON public.notes(is_public);

-- Enable Row Level Security (should already be enabled if table exists)
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can view public notes" ON public.notes;
DROP POLICY IF EXISTS "Users can insert their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON public.notes;

-- Create RLS Policies
CREATE POLICY "Users can view their own notes"
ON public.notes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view public notes"
ON public.notes FOR SELECT
USING (is_public = true);

CREATE POLICY "Users can insert their own notes"
ON public.notes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
ON public.notes FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
ON public.notes FOR DELETE
USING (auth.uid() = user_id);

-- Add to realtime publication
DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;
EXCEPTION 
  WHEN duplicate_object THEN
    NULL; -- Table already in publication
END $$;