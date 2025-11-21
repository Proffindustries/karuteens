-- Moderation tables for content moderation system

-- Enforcement actions table
CREATE TABLE IF NOT EXISTS enforcement_actions (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
	moderator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
	action_type TEXT NOT NULL, -- 'warn', 'suspend', 'ban', 'delete_content', 'hide_content', 'reset_password'
	target_type TEXT NOT NULL, -- 'user', 'content', 'comment'
	target_id TEXT NOT NULL,
	reason TEXT NOT NULL,
	description TEXT,
	duration INTERVAL, -- for temporary suspensions/bans
	created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Appeals table
CREATE TABLE IF NOT EXISTS appeals (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
	user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
	reason TEXT NOT NULL,
	description TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'reviewing', 'approved', 'rejected'
	created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Moderation logs/audit trail
CREATE TABLE IF NOT EXISTS moderation_logs (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	moderator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
	action_type TEXT NOT NULL,
	target_type TEXT NOT NULL,
	target_id TEXT NOT NULL,
	reason TEXT NOT NULL,
	description TEXT,
	ip_address TEXT,
	user_agent TEXT,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Auto-flagged content table
CREATE TABLE IF NOT EXISTS auto_flags (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	content_type TEXT NOT NULL, -- 'post', 'comment', 'user_profile', 'media'
	content_id TEXT NOT NULL,
	flag_type TEXT NOT NULL, -- 'toxicity', 'nudity', 'hate_speech', 'spam', 'copyright'
	confidence_score DECIMAL(3,2), -- 0.00 to 1.00
	details JSONB,
	status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'reviewed', 'dismissed'
	created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE enforcement_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE appeals ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_flags ENABLE ROW LEVEL SECURITY;

-- Policies for enforcement_actions
CREATE POLICY "Moderators can view enforcement actions"
ON enforcement_actions FOR SELECT
USING (true);

CREATE POLICY "Moderators can create enforcement actions"
ON enforcement_actions FOR INSERT
WITH CHECK (true);

-- Policies for appeals
CREATE POLICY "Users can view their own appeals"
ON appeals FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Moderators can view all appeals"
ON appeals FOR SELECT
USING (true);

CREATE POLICY "Users can create appeals"
ON appeals FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Moderators can update appeals"
ON appeals FOR UPDATE
USING (true);

-- Policies for moderation_logs
CREATE POLICY "Moderators can view moderation logs"
ON moderation_logs FOR SELECT
USING (true);

CREATE POLICY "System can create moderation logs"
ON moderation_logs FOR INSERT
WITH CHECK (true);

-- Policies for auto_flags
CREATE POLICY "Moderators can view auto flags"
ON auto_flags FOR SELECT
USING (true);

CREATE POLICY "System can create auto flags"
ON auto_flags FOR INSERT
WITH CHECK (true);

CREATE POLICY "Moderators can update auto flags"
ON auto_flags FOR UPDATE
USING (true);

-- Indexes for better performance
CREATE INDEX idx_enforcement_actions_report_id ON enforcement_actions(report_id);
CREATE INDEX idx_enforcement_actions_moderator_id ON enforcement_actions(moderator_id);
CREATE INDEX idx_enforcement_actions_target ON enforcement_actions(target_type, target_id);
CREATE INDEX idx_appeals_report_id ON appeals(report_id);
CREATE INDEX idx_appeals_user_id ON appeals(user_id);
CREATE INDEX idx_appeals_status ON appeals(status);
CREATE INDEX idx_moderation_logs_moderator_id ON moderation_logs(moderator_id);
CREATE INDEX idx_moderation_logs_target ON moderation_logs(target_type, target_id);
CREATE INDEX idx_auto_flags_content ON auto_flags(content_type, content_id);
CREATE INDEX idx_auto_flags_status ON auto_flags(status);
CREATE INDEX idx_auto_flags_flag_type ON auto_flags(flag_type);