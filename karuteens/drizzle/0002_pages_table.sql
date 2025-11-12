-- Pages table
CREATE TABLE IF NOT EXISTS pages (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
	title text NOT NULL,
	slug text NOT NULL UNIQUE,
	description text,
	content text,
	cover_url text,
	is_published boolean DEFAULT true NOT NULL,
	created_at timestamp with time zone DEFAULT now() NOT NULL,
	updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view published pages"
ON pages FOR SELECT
USING (is_published = true);

CREATE POLICY "Authors can view their own pages"
ON pages FOR SELECT
USING (auth.uid() = author_id);

CREATE POLICY "Authors can create pages"
ON pages FOR INSERT
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their pages"
ON pages FOR UPDATE
USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their pages"
ON pages FOR DELETE
USING (auth.uid() = author_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE pages;
