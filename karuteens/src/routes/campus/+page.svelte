<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase/client';
  import { user } from '$lib/stores/auth';
  import { MapPin, Calendar, Users, BookOpen, Coffee, Wifi, Clock, Search, Filter, X, Check } from 'lucide-svelte';

  type Resource = {
    id: string;
    name: string;
    type: string;
    description?: string;
    location?: string;
    capacity?: number;
    image_url?: string;
    is_bookable: boolean;
    available_from?: string;
    available_to?: string;
  };

  type Booking = {
    id: string;
    resource_id: string;
    user_id: string;
    start_time: string;
    end_time: string;
    purpose?: string;
    status: string;
    created_at: string;
  };

  let loading = true;
  let resources: Resource[] = [];
  let myBookings: Booking[] = [];
  let searchQuery = '';
  let selectedType = 'all';
  let showBookModal = false;
  let selectedResource: Resource | null = null;
  let booking = false;

  const resourceTypes = ['room', 'equipment', 'facility'];
  const typeIcons: Record<string, any> = {
    room: MapPin,
    equipment: BookOpen,
    facility: Coffee
  };

  let bookingForm = {
    date: '',
    startTime: '',
    endTime: '',
    purpose: ''
  };

  onMount(async () => {
    await Promise.all([loadResources(), loadMyBookings()]);
    loading = false;
  });

  async function loadResources() {
    const { data } = await supabase
      .from('campus_resources')
      .select('*')
      .order('name');
    resources = data || [];
  }

  async function loadMyBookings() {
    if (!$user) return;
    const { data } = await supabase
      .from('resource_bookings')
      .select('*, campus_resources(name, type)')
      .eq('user_id', $user.id)
      .gte('end_time', new Date().toISOString())
      .order('start_time');
    myBookings = data || [];
  }

  function openBookModal(resource: Resource) {
    if (!$user) {
      window.location.href = '/auth/sign-in';
      return;
    }
    selectedResource = resource;
    showBookModal = true;
    const today = new Date().toISOString().split('T')[0];
    bookingForm = { date: today, startTime: resource.available_from || '09:00', endTime: resource.available_to || '17:00', purpose: '' };
  }

  function closeBookModal() {
    showBookModal = false;
    selectedResource = null;
    bookingForm = { date: '', startTime: '', endTime: '', purpose: '' };
  }

  async function submitBooking() {
    if (!selectedResource || !$user || !bookingForm.date || !bookingForm.startTime || !bookingForm.endTime) return;
    booking = true;

    const startTime = new Date(`${bookingForm.date}T${bookingForm.startTime}`);
    const endTime = new Date(`${bookingForm.date}T${bookingForm.endTime}`);

    const { error } = await supabase
      .from('resource_bookings')
      .insert({
        resource_id: selectedResource.id,
        user_id: $user.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        purpose: bookingForm.purpose || null,
        status: 'pending'
      });

    if (error) {
      alert(error.message);
      booking = false;
      return;
    }

    await loadMyBookings();
    closeBookModal();
    booking = false;
  }

  async function cancelBooking(bookingId: string) {
    if (!confirm('Cancel this booking?')) return;
    const { error } = await supabase
      .from('resource_bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId);
    
    if (!error) {
      await loadMyBookings();
    }
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  $: filteredResources = resources.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || r.type === selectedType;
    return matchesSearch && matchesType;
  });
</script>

<main class="max-w-screen-xl mx-auto px-4 py-8 space-y-8">
  <div class="text-center space-y-3">
    <h1 class="text-4xl font-black bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">Campus Life Hub</h1>
    <p class="text-foreground/70">Explore campus resources, facilities, and book spaces</p>
  </div>

  <!-- Quick Stats -->
  <section class="grid md:grid-cols-4 gap-4">
    <div class="rounded-xl border bg-white p-6 space-y-2">
      <MapPin class="size-8 text-blue-600" />
      <p class="text-2xl font-bold">{resources.filter(r => r.type === 'room').length}</p>
      <p class="text-sm text-foreground/60">Study Rooms</p>
    </div>
    <div class="rounded-xl border bg-white p-6 space-y-2">
      <BookOpen class="size-8 text-green-600" />
      <p class="text-2xl font-bold">{resources.filter(r => r.type === 'equipment').length}</p>
      <p class="text-sm text-foreground/60">Equipment</p>
    </div>
    <div class="rounded-xl border bg-white p-6 space-y-2">
      <Coffee class="size-8 text-orange-600" />
      <p class="text-2xl font-bold">{resources.filter(r => r.type === 'facility').length}</p>
      <p class="text-sm text-foreground/60">Facilities</p>
    </div>
    <div class="rounded-xl border bg-white p-6 space-y-2">
      <Calendar class="size-8 text-purple-600" />
      <p class="text-2xl font-bold">{myBookings.filter(b => b.status !== 'cancelled').length}</p>
      <p class="text-sm text-foreground/60">My Bookings</p>
    </div>
  </section>

  <!-- Search & Filter -->
  <section class="rounded-2xl border bg-white shadow-lg p-6 space-y-4">
    <div class="flex flex-col lg:flex-row gap-4">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-foreground/40" />
        <input 
          class="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
          placeholder="Search resources..."
          bind:value={searchQuery}
        />
      </div>
      
      <div class="relative">
        <Filter class="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-foreground/40" />
        <select class="rounded-lg border border-gray-300 pl-10 pr-8 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white" bind:value={selectedType}>
          <option value="all">All Types</option>
          {#each resourceTypes as type}
            <option value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}s</option>
          {/each}
        </select>
      </div>
    </div>
  </section>

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="animate-spin size-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
    </div>
  {:else}
    <!-- Resources Grid -->
    <section class="space-y-4">
      <h2 class="text-2xl font-bold">Available Resources</h2>
      {#if filteredResources.length === 0}
        <div class="text-center py-12">
          <MapPin class="size-16 mx-auto mb-4 text-foreground/30" />
          <h3 class="text-xl font-semibold mb-2">No resources found</h3>
          <p class="text-foreground/60">Try adjusting your search or filters</p>
        </div>
      {:else}
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {#each filteredResources as resource}
            <div class="rounded-2xl border bg-white overflow-hidden hover:shadow-xl transition-all">
              {#if resource.image_url}
                <img src={resource.image_url} alt={resource.name} class="w-full h-48 object-cover" />
              {:else}
                <div class="w-full h-48 bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center">
                  <svelte:component this={typeIcons[resource.type] || MapPin} class="size-20 text-white/30" />
                </div>
              {/if}
              
              <div class="p-5 space-y-3">
                <div class="flex items-start justify-between gap-2">
                  <h3 class="font-bold text-lg flex-1">{resource.name}</h3>
                  <span class="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 capitalize">{resource.type}</span>
                </div>
                
                {#if resource.description}
                  <p class="text-sm text-foreground/60 line-clamp-2">{resource.description}</p>
                {/if}
                
                <div class="space-y-2 text-sm">
                  {#if resource.location}
                    <div class="flex items-center gap-2 text-foreground/70">
                      <MapPin class="size-4" />
                      <span>{resource.location}</span>
                    </div>
                  {/if}
                  
                  {#if resource.capacity}
                    <div class="flex items-center gap-2 text-foreground/70">
                      <Users class="size-4" />
                      <span>Capacity: {resource.capacity}</span>
                    </div>
                  {/if}
                  
                  {#if resource.available_from && resource.available_to}
                    <div class="flex items-center gap-2 text-foreground/70">
                      <Clock class="size-4" />
                      <span>{resource.available_from} - {resource.available_to}</span>
                    </div>
                  {/if}
                </div>
                
                {#if resource.is_bookable}
                  <button 
                    class="w-full mt-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-green-600 text-white font-semibold hover:shadow-lg transition-all"
                    on:click={() => openBookModal(resource)}
                  >
                    Book Now
                  </button>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>

    <!-- My Bookings -->
    {#if myBookings.length > 0}
      <section class="space-y-4">
        <h2 class="text-2xl font-bold">My Upcoming Bookings</h2>
        <div class="space-y-3">
          {#each myBookings.filter(b => b.status !== 'cancelled') as booking}
            <div class="rounded-xl border bg-white p-5 flex items-center justify-between gap-4">
              <div class="flex-1">
                <h3 class="font-bold">{booking.campus_resources?.name}</h3>
                <p class="text-sm text-foreground/60">
                  {formatDate(booking.start_time)} • {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                </p>
                {#if booking.purpose}
                  <p class="text-sm text-foreground/50 mt-1">Purpose: {booking.purpose}</p>
                {/if}
              </div>
              <div class="flex items-center gap-3">
                <span class="px-3 py-1 rounded-full text-xs font-medium capitalize"
                  class:bg-yellow-100={booking.status === 'pending'}
                  class:text-yellow-700={booking.status === 'pending'}
                  class:bg-green-100={booking.status === 'approved'}
                  class:text-green-700={booking.status === 'approved'}
                  class:bg-red-100={booking.status === 'rejected'}
                  class:text-red-700={booking.status === 'rejected'}
                >
                  {booking.status}
                </span>
                {#if booking.status === 'pending' || booking.status === 'approved'}
                  <button 
                    class="px-3 py-1 rounded-lg border hover:bg-red-50 text-red-600 text-sm"
                    on:click={() => cancelBooking(booking.id)}
                  >
                    Cancel
                  </button>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </section>
    {/if}
  {/if}

  <!-- Booking Modal -->
  {#if showBookModal && selectedResource}
    <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" on:click={closeBookModal}>
      <div class="bg-white rounded-2xl max-w-md w-full p-6 space-y-4" on:click|stopPropagation>
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-bold">Book {selectedResource.name}</h2>
          <button class="p-2 hover:bg-gray-100 rounded-lg" on:click={closeBookModal}>
            <X class="size-5" />
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">Date *</label>
            <input type="date" class="w-full rounded-lg border px-4 py-2" bind:value={bookingForm.date} />
          </div>
          
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium mb-1">Start Time *</label>
              <input type="time" class="w-full rounded-lg border px-4 py-2" bind:value={bookingForm.startTime} />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">End Time *</label>
              <input type="time" class="w-full rounded-lg border px-4 py-2" bind:value={bookingForm.endTime} />
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-1">Purpose</label>
            <textarea class="w-full rounded-lg border px-4 py-2 resize-none" rows="3" bind:value={bookingForm.purpose} placeholder="Optional" />
          </div>
        </div>

        <div class="flex gap-3 pt-2">
          <button class="flex-1 px-4 py-2 rounded-lg border hover:bg-gray-100" on:click={closeBookModal}>Cancel</button>
          <button 
            class="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-green-600 text-white disabled:opacity-50" 
            on:click={submitBooking} 
            disabled={booking || !bookingForm.date || !bookingForm.startTime || !bookingForm.endTime}
          >
            {booking ? 'Booking...' : 'Confirm Booking'}
          </button>
        </div>
      </div>
    </div>
  {/if}
</main>
