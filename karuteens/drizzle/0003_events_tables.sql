-- Events table
CREATE TABLE IF NOT EXISTS events (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	organizer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
	title text NOT NULL,
	description text,
	location text,
	is_online boolean DEFAULT false NOT NULL,
	meeting_url text,
	cover_url text,
	category text NOT NULL,
	start_time timestamp with time zone NOT NULL,
	end_time timestamp with time zone,
	max_attendees integer,
	is_public boolean DEFAULT true NOT NULL,
	created_at timestamp with time zone DEFAULT now() NOT NULL,
	updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Policies for events
CREATE POLICY "Anyone can view public events"
ON events FOR SELECT
USING (is_public = true);

CREATE POLICY "Organizers can view their own events"
ON events FOR SELECT
USING (auth.uid() = organizer_id);

CREATE POLICY "Authenticated users can create events"
ON events FOR INSERT
WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Organizers can update their events"
ON events FOR UPDATE
USING (auth.uid() = organizer_id);

CREATE POLICY "Organizers can delete their events"
ON events FOR DELETE
USING (auth.uid() = organizer_id);

-- Event attendees table
CREATE TABLE IF NOT EXISTS event_attendees (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
	user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
	status text NOT NULL DEFAULT 'going', -- 'going', 'interested', 'maybe'
	joined_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;

-- Policies for event_attendees
CREATE POLICY "Anyone can view event attendees"
ON event_attendees FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can join events"
ON event_attendees FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their attendance"
ON event_attendees FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can leave events"
ON event_attendees FOR DELETE
USING (auth.uid() = user_id);

-- Event comments table
CREATE TABLE IF NOT EXISTS event_comments (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
	user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
	content text NOT NULL,
	created_at timestamp with time zone DEFAULT now() NOT NULL,
	updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE event_comments ENABLE ROW LEVEL SECURITY;

-- Policies for event_comments
CREATE POLICY "Anyone can view event comments"
ON event_comments FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can comment on events"
ON event_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their comments"
ON event_comments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their comments"
ON event_comments FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE events;
ALTER PUBLICATION supabase_realtime ADD TABLE event_attendees;
ALTER PUBLICATION supabase_realtime ADD TABLE event_comments;