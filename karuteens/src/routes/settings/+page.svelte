<script lang="ts">
  let email = '';
  let username = '';
  let dark = false;
</script>

<main class="max-w-screen-sm mx-auto px-4 py-6 space-y-6">
  <h1 class="text-2xl font-semibold">Settings</h1>

  <section class="rounded-xl border bg-white p-4 space-y-3">
    <h2 class="text-lg font-medium">Profile</h2>
    <label class="block space-y-1">
      <span class="text-sm">Username</span>
      <input class="w-full rounded-md border px-3 py-2" bind:value={username} />
    </label>
    <label class="block space-y-1">
      <span class="text-sm">Email</span>
      <input class="w-full rounded-md border px-3 py-2" type="email" bind:value={email} />
    </label>
    <button class="rounded-md bg-blue-600 text-white px-3 py-2">Save changes</button>
  </section>

  <section class="rounded-xl border bg-white p-4 space-y-3">
    <h2 class="text-lg font-medium">Appearance</h2>
    <label class="flex items-center gap-2 text-sm">
      <input type="checkbox" bind:checked={dark} />
      Dark mode
    </label>
  </section>
</main>
