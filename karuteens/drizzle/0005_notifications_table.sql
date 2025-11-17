-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
	type TEXT NOT NULL, -- 'comment', 'like', 'mention', 'event', 'follow', 'message'
	title TEXT NOT NULL,
	message TEXT NOT NULL,
	read BOOLEAN DEFAULT false NOT NULL,
	avatar_url TEXT,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies for notifications (only user can access their own notifications)
CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
ON notifications FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notifications"
ON notifications FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Indexes for better performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);