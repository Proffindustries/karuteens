<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabase/client';
  import { user } from '$lib/stores/auth';
  import { Calendar, MapPin, Users, Clock, Video, Edit, Trash2, Check, Star, Globe, Share2 } from 'lucide-svelte';
  
  let eventId = $page.params.id;
  let event: any = null;
  let loading = true;
  let isOrganizer = false;
  let myRsvp: any = null;
  let attendees: any[] = [];
  let attendeeCount = 0;
  
  onMount(async () => {
    await loadEvent();
  });
  
  async function loadEvent() {
    try {
      // Use our API instead of Supabase directly
      const response = await fetch(`/api/events/${eventId}`);
      const result = await response.json();
      
      if (result.success) {
        event = result.data;
        isOrganizer = $user?.id === result.data.organizer_id;
        await loadAttendees();
        await checkRsvp();
      } else {
        // Fallback to Supabase if API fails
        const { data } = await supabase
          .from('events')
          .select('*, profiles!events_organizer_id_fkey(username, avatar_url)')
          .eq('id', eventId)
          .single();
        
        if (data) {
          event = data;
          isOrganizer = $user?.id === data.organizer_id;
          await loadAttendees();
          await checkRsvp();
        }
      }
    } catch (error) {
      console.error('Error loading event:', error);
      // Fallback to Supabase if API fails
      const { data } = await supabase
        .from('events')
        .select('*, profiles!events_organizer_id_fkey(username, avatar_url)')
        .eq('id', eventId)
        .single();
      
      if (data) {
        event = data;
        isOrganizer = $user?.id === data.organizer_id;
        await loadAttendees();
        await checkRsvp();
      }
    }
    loading = false;
  }
  
  async function loadAttendees() {
    try {
      // Use our API instead of Supabase directly
      const response = await fetch(`/api/events/${eventId}/attendees`);
      const result = await response.json();
      
      if (result.success) {
        // For now, we'll still use Supabase to get profile info for attendees
        // In a full implementation, we'd enhance our API to include this
        const { data, count } = await supabase
          .from('event_attendees')
          .select('*, profiles!event_attendees_user_id_fkey(username, avatar_url)', { count: 'exact' })
          .eq('event_id', eventId);
        
        attendees = data || [];
        attendeeCount = count || 0;
      } else {
        // Fallback to Supabase if API fails
        const { data, count } = await supabase
          .from('event_attendees')
          .select('*, profiles!event_attendees_user_id_fkey(username, avatar_url)', { count: 'exact' })
          .eq('event_id', eventId);
        
        attendees = data || [];
        attendeeCount = count || 0;
      }
    } catch (error) {
      console.error('Error loading attendees:', error);
      // Fallback to Supabase if API fails
      const { data, count } = await supabase
        .from('event_attendees')
        .select('*, profiles!event_attendees_user_id_fkey(username, avatar_url)', { count: 'exact' })
        .eq('event_id', eventId);
      
      attendees = data || [];
      attendeeCount = count || 0;
    }
  }
  
  async function checkRsvp() {
    if (!$user) return;
    try {
      // For now, we'll still use Supabase for RSVP checking
      // In a full implementation, we'd enhance our API to handle this
      const { data } = await supabase
        .from('event_attendees')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', $user.id)
        .single();
      
      myRsvp = data;
    } catch (error) {
      console.error('Error checking RSVP:', error);
    }
  }
  
  async function rsvp(status: string) {
    if (!$user) { window.location.href = '/auth/sign-in'; return; }
    
    try {
      // Use our API instead of Supabase directly
      const response = await fetch(`/api/events/${eventId}/attendees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      
      const result = await response.json();
      
      if (result.success) {
        myRsvp = result.data;
        await loadAttendees();
      } else {
        alert(result.error || 'Failed to RSVP');
      }
    } catch (error) {
      console.error('Error RSVPing:', error);
      alert('Failed to RSVP');
    }
  }
  
  async function cancelRsvp() {
    if (!myRsvp) return;
    try {
      // Use our API instead of Supabase directly
      const response = await fetch(`/api/events/${eventId}/attendees`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        myRsvp = null;
        await loadAttendees();
      } else {
        alert('Failed to cancel RSVP');
      }
    } catch (error) {
      console.error('Error canceling RSVP:', error);
      alert('Failed to cancel RSVP');
    }
  }
  
  async function deleteEvent() {
    if (!confirm('Delete this event? This cannot be undone.')) return;
    
    try {
      // Use our API instead of Supabase directly
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        window.location.href = '/events';
      } else {
        alert(result.error || 'Failed to delete event');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event');
    }
  }
  
  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }
  
  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  
  function shareEvent() {
    if (navigator.share) {
      navigator.share({
        title: event.title,
        text: event.description,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  }
</script>

<main class="min-h-screen bg-gray-50">
  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="animate-spin size-12 border-4 border-purple-600 border-t-transparent rounded-full"></div>
    </div>
  {:else if !event}
    <div class="max-w-screen-md mx-auto px-4 py-12 text-center">
      <h1 class="text-2xl font-bold mb-2">Event Not Found</h1>
      <p class="text-foreground/60">This event doesn't exist or has been removed.</p>
      <a href="/events" class="mt-4 inline-block px-4 py-2 rounded-lg bg-purple-600 text-white">Browse Events</a>
    </div>
  {:else}
    <!-- Cover Image -->
    {#if event.cover_url}
      <div class="w-full h-80 bg-cover bg-center" style="background-image: url({event.cover_url})"></div>
    {:else}
      <div class="w-full h-80 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500"></div>
    {/if}
    
    <!-- Content -->
    <div class="max-w-screen-xl mx-auto px-4 -mt-20">
      <div class="grid lg:grid-cols-3 gap-6">
        <!-- Main Content -->
        <div class="lg:col-span-2 space-y-6">
          <div class="bg-white rounded-2xl shadow-xl p-8 space-y-6">
            <!-- Header -->
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-2">
                  <span class="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700">{event.category}</span>
                  {#if event.is_online}
                    <span class="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700 flex items-center gap-1">
                      <Video class="size-3" /> Online
                    </span>
                  {/if}
                </div>
                <h1 class="text-4xl font-black mb-3">{event.title}</h1>
              </div>
              
              <div class="flex gap-2">
                <button class="p-2 rounded-lg border hover:bg-gray-100" on:click={shareEvent} title="Share">
                  <Share2 class="size-5" />
                </button>
                {#if isOrganizer}
                  <a href="/events/{eventId}/edit" class="p-2 rounded-lg border hover:bg-gray-100" title="Edit">
                    <Edit class="size-5" />
                  </a>
                  <button class="p-2 rounded-lg border hover:bg-red-50 text-red-600" on:click={deleteEvent} title="Delete">
                    <Trash2 class="size-5" />
                  </button>
                {/if}
              </div>
            </div>
            
            <!-- Event Details -->
            <div class="space-y-4 py-4 border-y">
              <div class="flex items-start gap-3">
                <Calendar class="size-6 text-purple-600 mt-1" />
                <div>
                  <p class="font-semibold">{formatDate(event.start_time)}</p>
                  <p class="text-sm text-foreground/60">
                    {formatTime(event.start_time)}
                    {#if event.end_time}
                      - {formatTime(event.end_time)}
                    {/if}
                  </p>
                </div>
              </div>
              
              {#if event.is_online}
                <div class="flex items-start gap-3">
                  <Video class="size-6 text-purple-600 mt-1" />
                  <div>
                    <p class="font-semibold">Online Event</p>
                    {#if event.meeting_url && myRsvp}
                      <a href={event.meeting_url} target="_blank" class="text-sm text-purple-600 hover:underline">{event.meeting_url}</a>
                    {:else}
                      <p class="text-sm text-foreground/60">Meeting link available after RSVP</p>
                    {/if}
                  </div>
                </div>
              {:else if event.location}
                <div class="flex items-start gap-3">
                  <MapPin class="size-6 text-purple-600 mt-1" />
                  <div>
                    <p class="font-semibold">{event.location}</p>
                    <a href="https://maps.google.com/?q={encodeURIComponent(event.location)}" target="_blank" class="text-sm text-purple-600 hover:underline">View on map</a>
                  </div>
                </div>
              {/if}
              
              <div class="flex items-start gap-3">
                <Users class="size-6 text-purple-600 mt-1" />
                <div>
                  <p class="font-semibold">{attendeeCount} {attendeeCount === 1 ? 'Person' : 'People'} Attending</p>
                  {#if event.max_attendees}
                    <p class="text-sm text-foreground/60">{event.max_attendees - attendeeCount} spots left</p>
                  {/if}
                </div>
              </div>
            </div>
            
            <!-- Description -->
            {#if event.description}
              <div>
                <h2 class="text-xl font-bold mb-3">About This Event</h2>
                <p class="text-foreground/80 whitespace-pre-wrap">{event.description}</p>
              </div>
            {/if}
            
            <!-- Organizer -->
            <div class="pt-6 border-t">
              <h2 class="text-xl font-bold mb-3">Organized By</h2>
              <div class="flex items-center gap-3">
                <img 
                  src={event.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${event.profiles?.username}`} 
                  alt={event.profiles?.username}
                  class="size-12 rounded-full"
                />
                <div>
                  <p class="font-semibold">{event.profiles?.username}</p>
                  <p class="text-sm text-foreground/60">Event Organizer</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Sidebar -->
        <div class="lg:col-span-1 space-y-6">
          <!-- RSVP Card -->
          <div class="bg-white rounded-2xl shadow-xl p-6 space-y-4 sticky top-4">
            <h3 class="font-bold text-lg">Attend this event</h3>
            
            {#if myRsvp}
              <div class="space-y-3">
                <div class="p-3 rounded-lg bg-green-50 border border-green-200 flex items-center gap-2">
                  <Check class="size-5 text-green-600" />
                  <span class="text-sm font-medium text-green-700">
                    You're {myRsvp.status === 'going' ? 'going' : myRsvp.status === 'interested' ? 'interested' : 'maybe going'}
                  </span>
                </div>
                
                <div class="flex gap-2">
                  <button 
                    class="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                    class:bg-purple-600={myRsvp.status === 'going'}
                    class:text-white={myRsvp.status === 'going'}
                    class:border={myRsvp.status !== 'going'}
                    class:hover:bg-gray-50={myRsvp.status !== 'going'}
                    on:click={() => rsvp('going')}
                  >
                    Going
                  </button>
                  <button 
                    class="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                    class:bg-purple-600={myRsvp.status === 'interested'}
                    class:text-white={myRsvp.status === 'interested'}
                    class:border={myRsvp.status !== 'interested'}
                    class:hover:bg-gray-50={myRsvp.status !== 'interested'}
                    on:click={() => rsvp('interested')}
                  >
                    Interested
                  </button>
                </div>
                
                <button class="w-full px-4 py-2 rounded-lg border hover:bg-red-50 text-red-600 text-sm font-medium" on:click={cancelRsvp}>
                  Cancel RSVP
                </button>
              </div>
            {:else}
              <div class="space-y-3">
                <button class="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:shadow-lg transition-all" on:click={() => rsvp('going')}>
                  I'm Going!
                </button>
                <button class="w-full px-4 py-3 rounded-lg border hover:bg-gray-50 font-medium" on:click={() => rsvp('interested')}>
                  I'm Interested
                </button>
              </div>
            {/if}
          </div>
          
          <!-- Attendees -->
          {#if attendees.length > 0}
            <div class="bg-white rounded-2xl shadow-xl p-6 space-y-4">
              <h3 class="font-bold text-lg">{attendeeCount} Attending</h3>
              <div class="space-y-3 max-h-96 overflow-y-auto">
                {#each attendees.slice(0, 10) as attendee}
                  <div class="flex items-center gap-3">
                    <img 
                      src={attendee.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${attendee.profiles?.username}`} 
                      alt={attendee.profiles?.username}
                      class="size-10 rounded-full"
                    />
                    <div class="flex-1 min-w-0">
                      <p class="font-medium text-sm truncate">{attendee.profiles?.username}</p>
                      <p class="text-xs text-foreground/60 capitalize">{attendee.status}</p>
                    </div>
                  </div>
                {/each}
                {#if attendeeCount > 10}
                  <p class="text-sm text-center text-foreground/60 pt-2">+ {attendeeCount - 10} more</p>
                {/if}
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</main>
