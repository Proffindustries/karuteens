import { pgTable, text, timestamp, uuid, boolean, integer, jsonb, interval, decimal } from 'drizzle-orm/pg-core';

// User profiles table (extends Supabase auth.users)
export const profiles = pgTable('profiles', {
	id: uuid('id').primaryKey(), // matches auth.users.id
	username: text('username').notNull().unique(),
	fullName: text('full_name'),
	avatarUrl: text('avatar_url'),
	bio: text('bio'),
	location: text('location'),
	website: text('website'),
	twitterHandle: text('twitter_handle'),
	instagramHandle: text('instagram_handle'),
	isPrivate: boolean('is_private').default(false).notNull(),
	showEmail: boolean('show_email').default(false).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

// Posts table for feed
export const posts = pgTable('posts', {
	id: uuid('id').primaryKey().defaultRandom(),
	authorId: uuid('author_id')
		.notNull()
		.references(() => profiles.id, { onDelete: 'cascade' }),
	content: text('content').notNull(),
	imageUrl: text('image_url'),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

// Groups table
export const groups = pgTable('groups', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull(),
	description: text('description').notNull(),
	category: text('category').notNull(),
	avatarUrl: text('avatar_url'),
	creatorId: uuid('creator_id')
		.notNull()
		.references(() => profiles.id, { onDelete: 'cascade' }),
	isPrivate: boolean('is_private').default(false).notNull(),
	maxMembers: integer('max_members').default(100),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

// Group members table
export const groupMembers = pgTable('group_members', {
	id: uuid('id').primaryKey().defaultRandom(),
	groupId: uuid('group_id')
		.notNull()
		.references(() => groups.id, { onDelete: 'cascade' }),
	userId: uuid('user_id')
		.notNull()
		.references(() => profiles.id, { onDelete: 'cascade' }),
	role: text('role').notNull().default('member'), // 'creator', 'admin', 'member'
	joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull()
});

// Group messages table
export const groupMessages = pgTable('group_messages', {
	id: uuid('id').primaryKey().defaultRandom(),
	groupId: uuid('group_id')
		.notNull()
		.references(() => groups.id, { onDelete: 'cascade' }),
	senderId: uuid('sender_id')
		.notNull()
		.references(() => profiles.id, { onDelete: 'cascade' }),
	content: text('content'),
	mediaUrl: text('media_url'),
	mediaType: text('media_type'), // 'image', 'video', 'file'
	replyToId: uuid('reply_to_id'),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
	isDeleted: boolean('is_deleted').default(false).notNull()
});

// Message reactions table
export const messageReactions = pgTable('message_reactions', {
	id: uuid('id').primaryKey().defaultRandom(),
	messageId: uuid('message_id')
		.notNull()
		.references(() => groupMessages.id, { onDelete: 'cascade' }),
	userId: uuid('user_id')
		.notNull()
		.references(() => profiles.id, { onDelete: 'cascade' }),
	emoji: text('emoji').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// Direct messages/conversations
export const conversations = pgTable('conversations', {
	id: uuid('id').primaryKey().defaultRandom(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

// Conversation participants
export const conversationParticipants = pgTable('conversation_participants', {
	id: uuid('id').primaryKey().defaultRandom(),
	conversationId: uuid('conversation_id')
		.notNull()
		.references(() => conversations.id, { onDelete: 'cascade' }),
	userId: uuid('user_id')
		.notNull()
		.references(() => profiles.id, { onDelete: 'cascade' }),
	joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
	lastReadAt: timestamp('last_read_at', { withTimezone: true })
});

// Post reactions (likes, emojis) for feed posts
export const postReactions = pgTable('post_reactions', {
	id: uuid('id').primaryKey().defaultRandom(),
	postId: uuid('post_id')
		.notNull()
		.references(() => posts.id, { onDelete: 'cascade' }),
	userId: uuid('user_id')
		.notNull()
		.references(() => profiles.id, { onDelete: 'cascade' }),
	reactionType: text('reaction_type').notNull().default('like'), // 'like' | 'love' | 'haha' | ...
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// Comments for feed posts (supports replies via parentId)
export const comments = pgTable('comments', {
	id: uuid('id').primaryKey().defaultRandom(),
	postId: uuid('post_id')
		.notNull()
		.references(() => posts.id, { onDelete: 'cascade' }),
	userId: uuid('user_id')
		.notNull()
		.references(() => profiles.id, { onDelete: 'cascade' }),
	parentId: uuid('parent_id'),
	content: text('content').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;

// Comment reactions (likes, emojis) for feed post comments
export const commentReactions = pgTable('comment_reactions', {
	id: uuid('id').primaryKey().defaultRandom(),
	commentId: uuid('comment_id')
		.notNull()
		.references(() => comments.id, { onDelete: 'cascade' }),
	userId: uuid('user_id')
		.notNull()
		.references(() => profiles.id, { onDelete: 'cascade' }),
	reactionType: text('reaction_type').notNull().default('like'), // 'like' | 'love' | 'haha' | ...
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export type CommentReaction = typeof commentReactions.$inferSelect;
export type InsertCommentReaction = typeof commentReactions.$inferInsert;

// Direct messages
export const directMessages = pgTable('direct_messages', {
	id: uuid('id').primaryKey().defaultRandom(),
	conversationId: uuid('conversation_id')
		.notNull()
		.references(() => conversations.id, { onDelete: 'cascade' }),
	senderId: uuid('sender_id')
		.notNull()
		.references(() => profiles.id, { onDelete: 'cascade' }),
	content: text('content'),
	mediaUrl: text('media_url'),
	mediaType: text('media_type'),
	replyToId: uuid('reply_to_id'),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
	isDeleted: boolean('is_deleted').default(false).notNull(),
	isRead: boolean('is_read').default(false).notNull()
});

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = typeof profiles.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type InsertPost = typeof posts.$inferInsert;
export type Group = typeof groups.$inferSelect;
export type InsertGroup = typeof groups.$inferInsert;
export type GroupMember = typeof groupMembers.$inferSelect;
export type InsertGroupMember = typeof groupMembers.$inferInsert;
export type GroupMessage = typeof groupMessages.$inferSelect;
export type InsertGroupMessage = typeof groupMessages.$inferInsert;
export type MessageReaction = typeof messageReactions.$inferSelect;
export type InsertMessageReaction = typeof messageReactions.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;
export type ConversationParticipant = typeof conversationParticipants.$inferSelect;
export type InsertConversationParticipant = typeof conversationParticipants.$inferInsert;
// Study rooms
export const studyRooms = pgTable('study_rooms', {
	id: uuid('id').primaryKey().defaultRandom(),
	title: text('title').notNull(),
	subject: text('subject').notNull(),
	description: text('description'),
	hostId: uuid('host_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
	isPublic: boolean('is_public').default(true).notNull(),
	scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
	maxMembers: integer('max_members').default(20).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const studyRoomMembers = pgTable('study_room_members', {
	id: uuid('id').primaryKey().defaultRandom(),
	roomId: uuid('room_id').notNull().references(() => studyRooms.id, { onDelete: 'cascade' }),
	userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
	role: text('role').notNull().default('member'), // 'host' | 'member'
	joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
});

export const studyRoomMessages = pgTable('study_room_messages', {
	id: uuid('id').primaryKey().defaultRandom(),
	roomId: uuid('room_id').notNull().references(() => studyRooms.id, { onDelete: 'cascade' }),
	senderId: uuid('sender_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
	content: text('content'),
	mediaUrl: text('media_url'),
	mediaType: text('media_type'),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	isDeleted: boolean('is_deleted').default(false).notNull()
});

export type StudyRoom = typeof studyRooms.$inferSelect;
export type InsertStudyRoom = typeof studyRooms.$inferInsert;
export type StudyRoomMember = typeof studyRoomMembers.$inferSelect;
export type InsertStudyRoomMember = typeof studyRoomMembers.$inferInsert;
export type StudyRoomMessage = typeof studyRoomMessages.$inferSelect;
export type InsertStudyRoomMessage = typeof studyRoomMessages.$inferInsert;

// Pages (public/business profiles)
export const pages = pgTable('pages', {
	id: uuid('id').primaryKey().defaultRandom(),
	authorId: uuid('author_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
	title: text('title').notNull(),
	slug: text('slug').notNull().unique(),
	description: text('description'),
	content: text('content'),
	coverUrl: text('cover_url'),
	isPublished: boolean('is_published').default(true).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export type Page = typeof pages.$inferSelect;
export type InsertPage = typeof pages.$inferInsert;

// Events
export const events = pgTable('events', {
	id: uuid('id').primaryKey().defaultRandom(),
	organizerId: uuid('organizer_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
	title: text('title').notNull(),
	description: text('description'),
	location: text('location'),
	isOnline: boolean('is_online').default(false).notNull(),
	meetingUrl: text('meeting_url'),
	coverUrl: text('cover_url'),
	category: text('category').notNull(),
	startTime: timestamp('start_time', { withTimezone: true }).notNull(),
	endTime: timestamp('end_time', { withTimezone: true }),
	maxAttendees: integer('max_attendees'),
	isPublic: boolean('is_public').default(true).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const eventAttendees = pgTable('event_attendees', {
	id: uuid('id').primaryKey().defaultRandom(),
	eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
	userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
	status: text('status').notNull().default('going'), // 'going', 'interested', 'maybe'
	joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull()
});

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;
export type EventAttendee = typeof eventAttendees.$inferSelect;
export type InsertEventAttendee = typeof eventAttendees.$inferInsert;

// Event comments
export const eventComments = pgTable('event_comments', {
	id: uuid('id').primaryKey().defaultRandom(),
	eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
	userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
	content: text('content').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export type EventComment = typeof eventComments.$inferSelect;
export type InsertEventComment = typeof eventComments.$inferInsert;

// Campus Resources postgresql://postgres:[YOUR_PASSWORD]@db.pwylmgeuqceldkwhufbo.supabase.co:5432/postgres
export const campusResources = pgTable('campus_resources', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull(),
	type: text('type').notNull(), // 'room', 'equipment', 'facility'
	description: text('description'),
	location: text('location'),
	capacity: integer('capacity'),
	imageUrl: text('image_url'),
	isBookable: boolean('is_bookable').default(true).notNull(),
	availableFrom: text('available_from'), // e.g., '08:00'
	availableTo: text('available_to'), // e.g., '18:00'
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const resourceBookings = pgTable('resource_bookings', {
	id: uuid('id').primaryKey().defaultRandom(),
	resourceId: uuid('resource_id').notNull().references(() => campusResources.id, { onDelete: 'cascade' }),
	userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
	startTime: timestamp('start_time', { withTimezone: true }).notNull(),
	endTime: timestamp('end_time', { withTimezone: true }).notNull(),
	purpose: text('purpose'),
	status: text('status').notNull().default('pending'), // 'pending', 'approved', 'rejected', 'cancelled'
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export type CampusResource = typeof campusResources.$inferSelect;
export type InsertCampusResource = typeof campusResources.$inferInsert;
export type ResourceBooking = typeof resourceBookings.$inferSelect;
export type InsertResourceBooking = typeof resourceBookings.$inferInsert;

// Marketplace
export const marketplaceListings = pgTable('marketplace_listings', {
	id: uuid('id').primaryKey().defaultRandom(),
	sellerId: uuid('seller_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
	title: text('title').notNull(),
	description: text('description'),
	category: text('category').notNull(),
	price: integer('price').notNull(), // in cents
	condition: text('condition').notNull(), // 'new', 'like_new', 'good', 'fair'
	images: jsonb('images'), // array of image URLs
	location: text('location'),
	isAvailable: boolean('is_available').default(true).notNull(),
	views: integer('views').default(0).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const listingMessages = pgTable('listing_messages', {
	id: uuid('id').primaryKey().defaultRandom(),
	listingId: uuid('listing_id').notNull().references(() => marketplaceListings.id, { onDelete: 'cascade' }),
	senderId: uuid('sender_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
	receiverId: uuid('receiver_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
	message: text('message').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export type MarketplaceListing = typeof marketplaceListings.$inferSelect;
export type InsertMarketplaceListing = typeof marketplaceListings.$inferInsert;
export type ListingMessage = typeof listingMessages.$inferSelect;
export type InsertListingMessage = typeof listingMessages.$inferInsert;

// Entertainment
export const entertainmentContent = pgTable('entertainment_content', {
	id: uuid('id').primaryKey().defaultRandom(),
	creatorId: uuid('creator_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
	title: text('title').notNull(),
	description: text('description'),
	thumbnailUrl: text('thumbnail_url'),
	videoUrl: text('video_url'),
	streamUrl: text('stream_url'),
	category: text('category').notNull(), // 'video', 'stream', 'music', 'podcast'
	tags: jsonb('tags'), // array of tags
	duration: integer('duration'), // in seconds
	isLive: boolean('is_live').default(false).notNull(),
	views: integer('views').default(0).notNull(),
	likes: integer('likes').default(0).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const contentLikes = pgTable('content_likes', {
	id: uuid('id').primaryKey().defaultRandom(),
	contentId: uuid('content_id').notNull().references(() => entertainmentContent.id, { onDelete: 'cascade' }),
	userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const contentComments = pgTable('content_comments', {
	id: uuid('id').primaryKey().defaultRandom(),
	contentId: uuid('content_id').notNull().references(() => entertainmentContent.id, { onDelete: 'cascade' }),
	userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
	comment: text('comment').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export type EntertainmentContent = typeof entertainmentContent.$inferSelect;
export type InsertEntertainmentContent = typeof entertainmentContent.$inferInsert;
export type ContentLike = typeof contentLikes.$inferSelect;
export type InsertContentLike = typeof contentLikes.$inferInsert;
export type ContentComment = typeof contentComments.$inferSelect;
export type InsertContentComment = typeof contentComments.$inferInsert;

// Reports
export const reports = pgTable('reports', {
	id: uuid('id').primaryKey().defaultRandom(),
	reporterId: uuid('reporter_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
	reportType: text('report_type').notNull(), // 'user', 'content', 'technical'
	targetId: text('target_id'),
	reason: text('reason').notNull(),
	description: text('description').notNull(),
	status: text('status').notNull().default('pending'), // 'pending', 'reviewing', 'resolved', 'dismissed'
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;

// Enforcement Actions
export const enforcementActions = pgTable('enforcement_actions', {
	id: uuid('id').primaryKey().defaultRandom(),
	reportId: uuid('report_id').references(() => reports.id, { onDelete: 'cascade' }),
	moderatorId: uuid('moderator_id').references(() => profiles.id, { onDelete: 'cascade' }),
	actionType: text('action_type').notNull(), // 'warn', 'suspend', 'ban', 'delete_content', 'hide_content', 'reset_password'
	targetType: text('target_type').notNull(), // 'user', 'content', 'comment'
	targetId: text('target_id').notNull(),
	reason: text('reason').notNull(),
	description: text('description'),
	duration: interval('duration'), // for temporary suspensions/bans
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export type EnforcementAction = typeof enforcementActions.$inferSelect;
export type InsertEnforcementAction = typeof enforcementActions.$inferInsert;

// Appeals
export const appeals = pgTable('appeals', {
	id: uuid('id').primaryKey().defaultRandom(),
	reportId: uuid('report_id').references(() => reports.id, { onDelete: 'cascade' }),
	userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }),
	reason: text('reason').notNull(),
	description: text('description').notNull(),
	status: text('status').notNull().default('pending'), // 'pending', 'reviewing', 'approved', 'rejected'
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export type Appeal = typeof appeals.$inferSelect;
export type InsertAppeal = typeof appeals.$inferInsert;

// Moderation Logs
export const moderationLogs = pgTable('moderation_logs', {
	id: uuid('id').primaryKey().defaultRandom(),
	moderatorId: uuid('moderator_id').references(() => profiles.id, { onDelete: 'cascade' }),
	actionType: text('action_type').notNull(),
	targetType: text('target_type').notNull(),
	targetId: text('target_id').notNull(),
	reason: text('reason').notNull(),
	description: text('description'),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export type ModerationLog = typeof moderationLogs.$inferSelect;
export type InsertModerationLog = typeof moderationLogs.$inferInsert;

// Auto Flags
export const autoFlags = pgTable('auto_flags', {
	id: uuid('id').primaryKey().defaultRandom(),
	contentType: text('content_type').notNull(), // 'post', 'comment', 'user_profile', 'media'
	contentId: text('content_id').notNull(),
	flagType: text('flag_type').notNull(), // 'toxicity', 'nudity', 'hate_speech', 'spam', 'copyright'
	confidenceScore: decimal('confidence_score', { precision: 3, scale: 2 }), // 0.00 to 1.00
	details: jsonb('details'),
	status: text('status').notNull().default('pending'), // 'pending', 'reviewed', 'dismissed'
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export type AutoFlag = typeof autoFlags.$inferSelect;
export type InsertAutoFlag = typeof autoFlags.$inferInsert;

// Notifications table
export const notifications = pgTable('notifications', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
	type: text('type').notNull(), // 'comment', 'like', 'mention', 'event', 'follow', 'message'
	title: text('title').notNull(),
	message: text('message').notNull(),
	read: boolean('read').default(false).notNull(),
	avatarUrl: text('avatar_url'),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// Notes
export const notes = pgTable('notes', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
	title: text('title').notNull(),
	description: text('description'),
	content: text('content'),
	isPublic: boolean('is_public').default(false).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export type Note = typeof notes.$inferSelect;
export type InsertNote = typeof notes.$inferInsert;

// Sessions for authentication
export const sessions = pgTable('sessions', {
	id: text('id').primaryKey(),
	userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;








