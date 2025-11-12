import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read environment variables
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = envVars.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const sql = `
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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view published pages" ON pages;
DROP POLICY IF EXISTS "Authors can view their own pages" ON pages;
DROP POLICY IF EXISTS "Authors can create pages" ON pages;
DROP POLICY IF EXISTS "Authors can update their pages" ON pages;
DROP POLICY IF EXISTS "Authors can delete their pages" ON pages;

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
`;

console.log('Running migration...');
const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

if (error) {
  console.error('Migration failed:', error);
} else {
  console.log('Migration successful!');
  
  // Enable realtime
  const { error: realtimeError } = await supabase.rpc('exec_sql', { 
    sql_query: 'ALTER PUBLICATION supabase_realtime ADD TABLE pages;' 
  });
  
  if (realtimeError) {
    console.warn('Realtime setup warning:', realtimeError.message);
  } else {
    console.log('Realtime enabled!');
  }
}

process.exit(0);
