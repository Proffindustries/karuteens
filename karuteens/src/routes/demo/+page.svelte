<!-- Landing hero content (navbar is global) -->
<script lang="ts">
  import { ArrowRight } from 'lucide-svelte';
</script>

<section class="min-h-[100svh] bg-gradient-to-b from-blue-600 to-sky-500 text-white flex flex-col">
  <!-- Navbar rendered by layout -->

  <div class="flex-1 grid place-items-center px-6">
    <div class="max-w-md text-center space-y-4">
      <h1 class="text-3xl sm:text-4xl font-bold leading-tight">Study smarter. Connect faster.</h1>
      <p class="text-white/90">Groups, resources, and an AI study buddy — all in one fast, secure place.</p>
      <div class="flex items-center justify-center gap-3">
        <a href="/signup" class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-blue-700 font-semibold shadow">
          Join now <ArrowRight class="size-4" />
        </a>
        <a href="/feed" class="inline-flex px-4 py-2 rounded-lg border border-white/40 hover:bg-white/10">Explore</a>
      </div>
    </div>
  </div>

  <footer class="px-4 py-4 text-center text-white/80 text-sm">© {new Date().getFullYear()} KaruTeens</footer>
  
  <style>
    .rounded-md\/btn { border-radius: 0.625rem; }
  </style>
</section>