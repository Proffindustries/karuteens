<script lang="ts">
  type Notif = { id: number; text: string; time: string };
  let notifications: Notif[] = [
    { id: 1, text: 'Alex commented on your post', time: '5m' },
    { id: 2, text: 'Jamie mentioned you in a group', time: '20m' }
  ];
</script>

<main class="max-w-screen-sm mx-auto px-4 py-6 space-y-4">
  <h1 class="text-2xl font-semibold">Notifications</h1>

  <section class="space-y-2">
    {#each notifications as n}
      <div class="rounded-xl border bg-white p-3 flex items-center justify-between">
        <div>{n.text}</div>
        <div class="text-xs text-foreground/60">{n.time}</div>
      </div>
    {/each}
  </section>
</main>
