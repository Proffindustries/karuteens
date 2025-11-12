-- Check if notes table exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notes') THEN
    -- Create notes table if it doesn't exist
    CREATE TABLE public.notes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        title text NOT NULL,
        description text,
        content text,
        is_public boolean DEFAULT false NOT NULL,
        created_at timestamp with timezone DEFAULT now() NOT NULL,
        updated_at timestamp with timezone DEFAULT now() NOT NULL
    );
  END IF;
END $$;

-- Add missing columns if table exists but is incomplete
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS title text NOT NULL;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS content text;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false NOT NULL;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS created_at timestamp with timezone DEFAULT now() NOT NULL;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS updated_at timestamp with timezone DEFAULT now() NOT NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON public.notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_is_public ON public.notes(is_public);

-- Enable Row Level Security
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can view their own notes') THEN
    CREATE POLICY "Users can view their own notes"
    ON public.notes FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can view public notes') THEN
    CREATE POLICY "Users can view public notes"
    ON public.notes FOR SELECT
    USING (is_public = true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can insert their own notes') THEN
    CREATE POLICY "Users can insert their own notes"
    ON public.notes FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can update their own notes') THEN
    CREATE POLICY "Users can update their own notes"
    ON public.notes FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can delete their own notes') THEN
    CREATE POLICY "Users can delete their own notes"
    ON public.notes FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Add to realtime publication
DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;
EXCEPTION 
  WHEN duplicate_object THEN
    -- Table already in publication, do nothing
    NULL;
END $$;
