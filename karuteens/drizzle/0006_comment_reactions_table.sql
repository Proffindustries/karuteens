-- Comment reactions table for feed post comments
CREATE TABLE IF NOT EXISTS comment_reactions (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
	user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
	reaction_type TEXT NOT NULL DEFAULT 'like', -- 'like' | 'love' | 'haha' | ...
	created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;

-- Policies for comment reactions (only user can access their own reactions)
CREATE POLICY "Users can view comment reactions"
ON comment_reactions FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own comment reactions"
ON comment_reactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comment reactions"
ON comment_reactions FOR DELETE
USING (auth.uid() = user_id);

-- Indexes for better performance
CREATE INDEX idx_comment_reactions_comment_id ON comment_reactions(comment_id);
CREATE INDEX idx_comment_reactions_user_id ON comment_reactions(user_id);