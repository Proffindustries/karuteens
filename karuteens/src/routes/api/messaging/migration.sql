-- Add typing indicator fields to conversation_participants table
ALTER TABLE conversation_participants 
ADD COLUMN IF NOT EXISTS typing BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS typing_updated_at TIMESTAMP WITH TIME ZONE;