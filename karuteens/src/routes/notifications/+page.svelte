<script lang="ts">
  import { onMount } from 'svelte';
  import { Bell, MessageCircle, User, Heart, Calendar, Users, X, Check, Trash2, Settings } from 'lucide-svelte';
  import { user } from '$lib/stores/auth';
  import { supabase } from '$lib/supabase/client';

  type Notification = {
    id: string;
    type: 'comment' | 'like' | 'mention' | 'event' | 'follow' | 'message';
    title: string;
    message: string;
    time: string;
    read: boolean;
    avatar_url?: string;
    created_at: string;
  };

  let loading = true;
  let notifications: Notification[] = [];
  let unreadCount = 0;

  onMount(async () => {
    await loadNotifications();
    loading = false;
  });

  async function loadNotifications() {
    try {
      const response = await fetch('/api/notifications?limit=50');
      const result = await response.json();
      
      if (result.success) {
        notifications = result.data.map((n: any) => ({
          ...n,
          time: formatTime(n.created_at)
        }));
        unreadCount = notifications.filter(n => !n.read).length;
      } else {
        // Fallback to mock data if API fails
        useMockData();
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      // Fallback to mock data if API fails
      useMockData();
    }
  }

  function useMockData() {
    notifications = [
      {
        id: '1',
        type: 'comment',
        title: 'New Comment',
        message: 'Alex commented on your post: "Great insights!"',
        time: '5 minutes ago',
        read: false,
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        type: 'like',
        title: 'Post Liked',
        message: 'Jamie and 3 others liked your post',
        time: '20 minutes ago',
        read: false,
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jamie',
        created_at: new Date(Date.now() - 20 * 60000).toISOString()
      },
      {
        id: '3',
        type: 'event',
        title: 'Event Reminder',
        message: 'Study Group Session starts in 1 hour',
        time: '1 hour ago',
        read: true,
        avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Event',
        created_at: new Date(Date.now() - 60 * 60000).toISOString()
      },
      {
        id: '4',
        type: 'mention',
        title: 'Mentioned',
        message: 'Taylor mentioned you in a group discussion',
        time: '2 hours ago',
        read: true,
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Taylor',
        created_at: new Date(Date.now() - 120 * 60000).toISOString()
      },
      {
        id: '5',
        type: 'message',
        title: 'New Message',
        message: 'You have a new message from Morgan',
        time: '1 day ago',
        read: true,
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Morgan',
        created_at: new Date(Date.now() - 24 * 60 * 60000).toISOString()
      }
    ];

    unreadCount = notifications.filter(n => !n.read).length;
  }

  function formatTime(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  function getNotificationIcon(type: string) {
    switch (type) {
      case 'comment': return MessageCircle;
      case 'like': return Heart;
      case 'mention': return User;
      case 'event': return Calendar;
      case 'follow': return Users;
      case 'message': return MessageCircle;
      default: return Bell;
    }
  }

  function getNotificationColor(type: string) {
    switch (type) {
      case 'comment': return 'text-blue-500';
      case 'like': return 'text-red-500';
      case 'mention': return 'text-purple-500';
      case 'event': return 'text-green-500';
      case 'follow': return 'text-yellow-500';
      case 'message': return 'text-indigo-500';
      default: return 'text-gray-500';
    }
  }

  async function markAsRead(id: string) {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ read: true })
      });
      
      const result = await response.json();
      
      if (result.success) {
        notifications = notifications.map(n => 
          n.id === id ? { ...n, read: true } : n
        );
        unreadCount = notifications.filter(n => !n.read).length;
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Fallback to client-side update
      notifications = notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      );
      unreadCount = notifications.filter(n => !n.read).length;
    }
  }

  async function markAllAsRead() {
    try {
      const response = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      const result = await response.json();
      
      if (result.success) {
        notifications = notifications.map(n => ({ ...n, read: true }));
        unreadCount = 0;
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      // Fallback to client-side update
      notifications = notifications.map(n => ({ ...n, read: true }));
      unreadCount = 0;
    }
  }

  async function deleteNotification(id: string) {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        notifications = notifications.filter(n => n.id !== id);
        unreadCount = notifications.filter(n => !n.read).length;
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      // Fallback to client-side update
      notifications = notifications.filter(n => n.id !== id);
      unreadCount = notifications.filter(n => !n.read).length;
    }
  }

  async function clearAll() {
    try {
      const response = await fetch('/api/notifications/clear', {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (result.success) {
        notifications = [];
        unreadCount = 0;
      }
    } catch (error) {
      console.error('Error clearing all notifications:', error);
      // Fallback to client-side update
      notifications = [];
      unreadCount = 0;
    }
  }

  function handleImageError(event: any) {
    event.currentTarget.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Default';
  }
</script>

<main class="max-w-screen-md mx-auto px-4 py-6 space-y-6">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold flex items-center gap-2">
        <Bell class="size-6" />
        Notifications
      </h1>
      <p class="text-foreground/60 text-sm">
        {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
      </p>
    </div>
    
    <div class="flex gap-2">
      <button 
        class="px-3 py-2 text-sm rounded-lg border hover:bg-gray-100 flex items-center gap-2"
        on:click={markAllAsRead}
        disabled={unreadCount === 0}
      >
        <Check class="size-4" />
        Mark all as read
      </button>
      <button 
        class="px-3 py-2 text-sm rounded-lg border hover:bg-gray-100 flex items-center gap-2"
        on:click={clearAll}
        disabled={notifications.length === 0}
      >
        <Trash2 class="size-4" />
        Clear all
      </button>
    </div>
  </div>

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="animate-spin size-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
    </div>
  {:else}
    {#if notifications.length === 0}
      <div class="rounded-2xl border bg-white p-12 text-center">
        <div class="inline-flex p-4 rounded-full bg-gray-100 mb-4">
          <Bell class="size-8 text-foreground/40" />
        </div>
        <h3 class="text-lg font-semibold mb-2">No notifications yet</h3>
        <p class="text-foreground/60">When you have notifications, they'll appear here</p>
      </div>
    {:else}
      <section class="space-y-3">
        {#each notifications as notification}
          <div class="rounded-2xl border bg-white p-4 hover:shadow-md transition-shadow {notification.read ? '' : 'border-blue-200 bg-blue-50'}">
            <div class="flex gap-3">
              <div class="flex-shrink-0">
                {#if notification.avatar_url}
                  <img 
                    src={notification.avatar_url} 
                    alt="Avatar" 
                    class="size-10 rounded-full object-cover"
                    on:error={handleImageError}
                  />
                {:else}
                  <div class="size-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <svelte:component 
                      this={getNotificationIcon(notification.type)} 
                      class="size-5 {getNotificationColor(notification.type)}" 
                    />
                  </div>
                {/if}
              </div>
              
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <h3 class="font-semibold text-sm truncate">{notification.title}</h3>
                    <p class="text-sm text-foreground/80 mt-1">{notification.message}</p>
                  </div>
                  <div class="flex-shrink-0 text-xs text-foreground/60 whitespace-nowrap">
                    {notification.time}
                  </div>
                </div>
                
                <div class="flex items-center gap-2 mt-3">
                  <button 
                    class="text-xs px-2 py-1 rounded border hover:bg-gray-100"
                    on:click={() => markAsRead(notification.id)}
                    disabled={notification.read}
                  >
                    {notification.read ? 'Read' : 'Mark as read'}
                  </button>
                  <button 
                    class="text-xs px-2 py-1 rounded border hover:bg-gray-100 text-red-600"
                    on:click={() => deleteNotification(notification.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        {/each}
      </section>
    {/if}
  {/if}
</main>