-- Sessions table for authentication
CREATE TABLE IF NOT EXISTS sessions (
	id TEXT PRIMARY KEY,
	user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
	expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Policies for sessions (only user can access their own sessions)
CREATE POLICY "Users can view their own sessions"
ON sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
ON sessions FOR DELETE
USING (auth.uid() = user_id);