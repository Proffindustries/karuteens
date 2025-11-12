# Notes Feature for karuteens

## Overview
The notes feature allows students to create, organize, and share study notes with their peers. Users can create private notes for personal use or share public notes with the community.

## Features Implemented

### 1. Notes List Page (/notes)
- View all your personal notes
- Browse public notes from other users
- Search functionality across all notes
- Create new notes with the "New Note" button
- Edit or delete your own notes
- Toggle privacy settings (public/private)

### 2. Note Detail Page (/notes/[id])
- View note content
- Edit note title, description, and content
- Toggle privacy settings
- Delete notes
- See author information and timestamps

## Database Schema

### Notes Table
```sql
CREATE TABLE public.notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    content text,
    is_public boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
```

### Indexes
- `idx_notes_user_id` - For fast user note lookups
- `idx_notes_created_at` - For chronological sorting
- `idx_notes_is_public` - For public notes filtering

### RLS Policies
- Users can view their own notes
- Users can view public notes from others
- Users can only edit/delete their own notes

## Implementation Files

1. `/src/routes/notes/+page.svelte` - Main notes list page
2. `/src/routes/notes/[id]/+page.svelte` - Individual note view/edit page
3. `/src/lib/server/db/schema.ts` - Database schema definition
4. `/notes_migration.sql` - SQL migration script

## Functionality

### User Notes
- Authenticated users can create unlimited notes
- Notes can be private (only visible to creator) or public
- Full CRUD operations on personal notes
- Rich text editing capabilities

### Community Notes
- Public notes are visible to all authenticated users
- Sorted by creation date (newest first)
- Shows author information and creation date
- Limited to 20 most recent public notes

### Search
- Search across note titles, descriptions, and content
- Works for both personal and public notes
- Real-time filtering as you type

## Privacy & Security
- All notes are private by default
- Users must explicitly make notes public to share
- Row Level Security ensures users can only access their own notes
- Public notes do not expose sensitive user information

## Technical Details
- Built with SvelteKit and Supabase
- Real-time updates through Supabase subscriptions
- Responsive design for mobile and desktop
- Uses Lucide Svelte icons for UI elements
- Implements proper error handling and user feedback