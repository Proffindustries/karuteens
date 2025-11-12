<!-- Landing hero content -->
<script lang="ts">
  import { ArrowRight, Sparkles, Users, BookOpen, Zap, Brain, Rocket } from 'lucide-svelte';
  import { onMount } from 'svelte';

  let mounted = false;
  let floatingIndex = 0;

  onMount(() => {
    mounted = true;
    const interval = setInterval(() => {
      floatingIndex = (floatingIndex + 1) % 3;
    }, 3000);
    return () => clearInterval(interval);
  });
</script>

<section class="min-h-[100svh] bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 relative overflow-hidden">
  <!-- Animated Background Elements -->
  <div class="absolute inset-0 overflow-hidden">
    <!-- Floating Orbs -->
    <div class="absolute top-20 left-10 w-72 h-72 bg-pink-500/30 rounded-full blur-3xl animate-blob"></div>
    <div class="absolute top-40 right-10 w-96 h-96 bg-yellow-500/30 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
    <div class="absolute bottom-20 left-1/3 w-80 h-80 bg-blue-500/30 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
    
    <!-- Grid Pattern -->
    <div class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]"></div>
  </div>

  <div class="relative flex flex-col min-h-[100svh] text-white">
    <!-- Hero Section -->
    <div class="flex-1 flex items-center justify-center px-4 py-12">
      <div class="max-w-6xl mx-auto w-full">
        <div class="text-center space-y-8">
          <!-- Badge -->
          <div class="{mounted ? 'animate-fade-in-down' : 'opacity-0'} inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-sm font-medium">
            <Sparkles class="size-4 text-yellow-300 animate-pulse" />
            <span>Welcome to the Future of Teen Learning</span>
          </div>

          <!-- Main Heading with Gradient Text -->
          <h1 class="{mounted ? 'animate-fade-in-up animation-delay-200' : 'opacity-0'} text-5xl sm:text-6xl md:text-7xl font-black leading-tight">
            <span class="block bg-gradient-to-r from-white via-cyan-200 to-purple-200 bg-clip-text text-transparent animate-gradient-x">
              Study Smarter.
            </span>
            <span class="block bg-gradient-to-r from-purple-200 via-pink-200 to-yellow-200 bg-clip-text text-transparent animate-gradient-x animation-delay-1000">
              Connect Faster.
            </span>
          </h1>

          <!-- Subheading -->
          <p class="{mounted ? 'animate-fade-in-up animation-delay-400' : 'opacity-0'} text-xl sm:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed">
            Join <span class="font-bold text-yellow-300 animate-pulse">thousands of teens</span> mastering their studies with 
            <span class="font-semibold text-cyan-300">AI-powered tools</span>, collaborative groups, and expert resources.
          </p>

          <!-- CTA Buttons -->
          <div class="{mounted ? 'animate-fade-in-up animation-delay-600' : 'opacity-0'} flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <a 
              href="/signup" 
              class="group relative inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white font-bold text-lg shadow-2xl shadow-purple-500/50 hover:shadow-purple-500/80 hover:scale-105 transition-all duration-300 overflow-hidden"
            >
              <span class="absolute inset-0 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
              <span class="relative flex items-center gap-2">
                <Rocket class="size-5 group-hover:animate-bounce" />
                Get Started Free
                <ArrowRight class="size-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </a>
            <a 
              href="/feed" 
              class="inline-flex items-center gap-2 px-8 py-4 rounded-full border-2 border-white/40 backdrop-blur-sm hover:bg-white/20 hover:border-white/60 hover:scale-105 transition-all duration-300 font-semibold text-lg shadow-lg"
            >
              <Sparkles class="size-5" />
              Explore Now
            </a>
          </div>

          <!-- Feature Pills -->
          <div class="{mounted ? 'animate-fade-in-up animation-delay-800' : 'opacity-0'} flex flex-wrap items-center justify-center gap-3 pt-8">
            <div class="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center gap-2 hover:bg-white/20 transition-all duration-300 hover:scale-110">
              <Brain class="size-5 text-cyan-300" />
              <span class="font-medium">AI Study Buddy</span>
            </div>
            <div class="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center gap-2 hover:bg-white/20 transition-all duration-300 hover:scale-110">
              <Users class="size-5 text-pink-300" />
              <span class="font-medium">Study Groups</span>
            </div>
            <div class="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center gap-2 hover:bg-white/20 transition-all duration-300 hover:scale-110">
              <BookOpen class="size-5 text-yellow-300" />
              <span class="font-medium">Free Resources</span>
            </div>
            <div class="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center gap-2 hover:bg-white/20 transition-all duration-300 hover:scale-110">
              <Zap class="size-5 text-orange-300" />
              <span class="font-medium">Lightning Fast</span>
            </div>
          </div>
        </div>

        <!-- Stats Section -->
        <div class="{mounted ? 'animate-fade-in-up animation-delay-1000' : 'opacity-0'} grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 max-w-4xl mx-auto">
          <div class="text-center p-6 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 hover:scale-105 transition-all duration-300">
            <div class="text-4xl font-black bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">10K+</div>
            <div class="text-sm text-white/80 mt-1">Active Students</div>
          </div>
          <div class="text-center p-6 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 hover:scale-105 transition-all duration-300">
            <div class="text-4xl font-black bg-gradient-to-r from-pink-300 to-purple-300 bg-clip-text text-transparent">500+</div>
            <div class="text-sm text-white/80 mt-1">Study Groups</div>
          </div>
          <div class="text-center p-6 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 hover:scale-105 transition-all duration-300">
            <div class="text-4xl font-black bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">24/7</div>
            <div class="text-sm text-white/80 mt-1">AI Support</div>
          </div>
          <div class="text-center p-6 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 hover:scale-105 transition-all duration-300">
            <div class="text-4xl font-black bg-gradient-to-r from-green-300 to-teal-300 bg-clip-text text-transparent">100%</div>
            <div class="text-sm text-white/80 mt-1">Free to Use</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="px-4 py-6 text-center text-white/60 text-sm backdrop-blur-sm">
      <p>© {new Date().getFullYear()} KaruTeens • Making Learning Fun & Effective</p>
    </footer>
  </div>
</section>

<style>
  @keyframes blob {
    0%, 100% { transform: translate(0, 0) scale(1); }
    25% { transform: translate(20px, -50px) scale(1.1); }
    50% { transform: translate(-20px, 20px) scale(0.9); }
    75% { transform: translate(50px, 50px) scale(1.05); }
  }

  @keyframes gradient-x {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }

  @keyframes fade-in-down {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fade-in-up {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-blob {
    animation: blob 7s infinite;
  }

  .animate-gradient-x {
    background-size: 200% 200%;
    animation: gradient-x 3s ease infinite;
  }

  .animate-fade-in-down {
    animation: fade-in-down 0.6s ease-out forwards;
  }

  .animate-fade-in-up {
    animation: fade-in-up 0.6s ease-out forwards;
  }

  .animation-delay-200 {
    animation-delay: 0.2s;
  }

  .animation-delay-400 {
    animation-delay: 0.4s;
  }

  .animation-delay-600 {
    animation-delay: 0.6s;
  }

  .animation-delay-800 {
    animation-delay: 0.8s;
  }

  .animation-delay-1000 {
    animation-delay: 1s;
  }

  .animation-delay-2000 {
    animation-delay: 2s;
  }

  .animation-delay-4000 {
    animation-delay: 4s;
  }
</style>
