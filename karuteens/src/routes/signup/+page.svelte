<!-- src/routes/signup/+page.svelte -->
<script lang="ts">
  let email = '';
  let password = '';
  let username = '';
  let showPassword = false;
  $: s = password ? strength(password) : null;

  function strength(pw: string): { label: string; value: number; color: string } {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const value = Math.min(score, 5);
    const labels = ['Very Weak', 'Weak', 'Okay', 'Good', 'Strong'];
    const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#7c3aed'];
    return { label: labels[Math.max(0, value - 1)] ?? 'Very Weak', value, color: colors[Math.max(0, value - 1)] ?? '#ef4444' };
  }

  const submit = (e: Event) => {
    e.preventDefault();
    alert('Account created (stub)');
  }
</script>

<main class="min-h-[100svh] grid place-items-center bg-auth-animated px-4">
  <form on:submit|preventDefault={submit} class="card-auth space-y-4">
    <h1 class="text-xl font-semibold">Create your account</h1>
    <label class="block space-y-1">
      <span class="text-sm">Username</span>
      <input class="input" bind:value={username} required />
    </label>
    <label class="block space-y-1">
      <span class="text-sm">Email</span>
      <input class="input" type="email" bind:value={email} required />
    </label>
    <label class="block space-y-1">
      <span class="text-sm">Password</span>
      <div class="relative">
        <input class="input pr-10" type={showPassword ? 'text' : 'password'} bind:value={password} required />
        <button type="button" class="absolute inset-y-0 right-2 my-auto text-sm text-foreground/70 hover:text-foreground btn px-2 py-1 !rounded focus-visible:ring-1"
          on:click={() => (showPassword = !showPassword)} aria-label="Toggle password visibility">
          {showPassword ? 'Hide' : 'Show'}
        </button>
      </div>
      {#if password}
        <div class="space-y-1">
          <div class="h-2 w-full bg-gray-200 rounded">
            <div class="h-2 rounded" style={`width: ${Math.min(s.value * 20, 100)}%; background-color: ${s.color}`}></div>
          </div>
          <span class="text-xs text-foreground/70">Strength: {s.label}</span>
        </div>
      {/if}
    </label>
    <button class="btn btn-primary w-full">Create account</button>
    <p class="text-sm text-center">Have an account? <a href="/login" class="link-fancy">Sign in</a></p>
  </form>
</main>
