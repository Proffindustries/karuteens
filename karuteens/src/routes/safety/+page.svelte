<script lang="ts">
  import { Shield, Heart, Phone, Lock, Users, AlertCircle, ExternalLink } from 'lucide-svelte';

  const mentalHealthResources = [
    { name: 'Kenya Mental Health Helpline', contact: '0800 720 729', description: '24/7 toll-free mental health support' },
    { name: 'Befrienders Kenya', contact: '0722 178 177', description: 'Emotional support and suicide prevention' },
    { name: 'AMHF Kenya', contact: '0719 629 702', description: 'Mental health advocacy and support' },
    { name: 'Moi Teaching & Referral Hospital', contact: '0728 730 000', description: 'Mental health services' }
  ];

  const safetyTips = [
    {
      title: 'Protect Your Personal Information',
      icon: Lock,
      tips: ['Never share your password with anyone', 'Use strong, unique passwords', 'Enable two-factor authentication', 'Be cautious about sharing personal details']
    },
    {
      title: 'Online Safety',
      icon: Shield,
      tips: ['Think before you post', 'Report suspicious activity', 'Block and report harassers', 'Verify user identity before meetups']
    },
    {
      title: 'Mental Health',
      icon: Heart,
      tips: ['Take breaks from social media', 'Reach out if you\'re struggling', 'Practice self-care regularly', 'Don\'t hesitate to seek professional help']
    },
    {
      title: 'Meeting People',
      icon: Users,
      tips: ['Meet in public places', 'Tell someone where you\'re going', 'Trust your instincts', 'Have an exit plan']
    }
  ];
</script>

<main class="max-w-screen-xl mx-auto px-4 py-8 space-y-8">
  <div class="text-center space-y-3">
    <div class="inline-flex items-center justify-center size-16 rounded-full bg-green-100 mb-4">
      <Shield class="size-8 text-green-600" />
    </div>
    <h1 class="text-4xl font-black">Safety Center</h1>
    <p class="text-foreground/70">Your wellbeing and security are our top priorities</p>
  </div>

  <!-- Emergency Banner -->
  <section class="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
    <div class="flex items-start gap-4">
      <AlertCircle class="size-8 text-red-600 flex-shrink-0" />
      <div class="flex-1">
        <h2 class="text-xl font-bold text-red-900 mb-2">In Case of Emergency</h2>
        <div class="grid md:grid-cols-2 gap-4">
          <div>
            <p class="font-semibold text-red-800">Emergency Services</p>
            <p class="text-2xl font-black text-red-600">999 / 112</p>
          </div>
          <div>
            <p class="font-semibold text-red-800">Campus Security</p>
            <p class="text-2xl font-black text-red-600">24/7 Available</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Mental Health Resources -->
  <section>
    <h2 class="text-3xl font-bold mb-6 flex items-center gap-3">
      <Heart class="size-8 text-pink-600" />
      Mental Health Resources
    </h2>
    <div class="grid md:grid-cols-2 gap-6">
      {#each mentalHealthResources as resource}
        <div class="bg-white rounded-2xl border shadow-lg p-6 hover:shadow-xl transition-all">
          <h3 class="font-bold text-lg mb-2">{resource.name}</h3>
          <a href="tel:{resource.contact}" class="text-2xl font-black text-pink-600 hover:text-pink-700 flex items-center gap-2 mb-2">
            <Phone class="size-5" />
            {resource.contact}
          </a>
          <p class="text-sm text-foreground/70">{resource.description}</p>
        </div>
      {/each}
    </div>
    <div class="mt-6 bg-pink-50 border border-pink-200 rounded-xl p-4">
      <p class="text-sm text-pink-800">
        <strong>Remember:</strong> It's okay to not be okay. Reaching out for help is a sign of strength, not weakness.
      </p>
    </div>
  </section>

  <!-- Safety Tips -->
  <section>
    <h2 class="text-3xl font-bold mb-6">Safety Tips</h2>
    <div class="grid md:grid-cols-2 gap-6">
      {#each safetyTips as tip}
        <div class="bg-white rounded-2xl border shadow-lg p-6">
          <div class="flex items-center gap-3 mb-4">
            <div class="inline-flex items-center justify-center size-12 rounded-full bg-blue-100">
              <svelte:component this={tip.icon} class="size-6 text-blue-600" />
            </div>
            <h3 class="font-bold text-lg">{tip.title}</h3>
          </div>
          <ul class="space-y-2">
            {#each tip.tips as item}
              <li class="flex items-start gap-2 text-sm text-foreground/80">
                <span class="text-blue-600 flex-shrink-0">•</span>
                <span>{item}</span>
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </div>
  </section>

  <!-- Reporting & Privacy -->
  <section class="grid md:grid-cols-2 gap-6">
    <div class="bg-white rounded-2xl border shadow-lg p-6">
      <div class="inline-flex items-center justify-center size-12 rounded-full bg-orange-100 mb-4">
        <AlertCircle class="size-6 text-orange-600" />
      </div>
      <h3 class="font-bold text-xl mb-3">Report Concerns</h3>
      <p class="text-foreground/70 mb-4">If you see something that concerns you or violates our community guidelines, please report it.</p>
      <a href="/report" class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 text-white font-semibold hover:bg-orange-700 transition-all">
        Report Issue
        <ExternalLink class="size-4" />
      </a>
    </div>

    <div class="bg-white rounded-2xl border shadow-lg p-6">
      <div class="inline-flex items-center justify-center size-12 rounded-full bg-purple-100 mb-4">
        <Lock class="size-6 text-purple-600" />
      </div>
      <h3 class="font-bold text-xl mb-3">Privacy Settings</h3>
      <p class="text-foreground/70 mb-4">Control who can see your profile and interact with you. Your privacy matters.</p>
      <a href="/profile" class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-all">
        Privacy Settings
        <ExternalLink class="size-4" />
      </a>
    </div>
  </section>

  <!-- Additional Resources -->
  <section class="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
    <h2 class="text-2xl font-bold mb-4">Additional Resources</h2>
    <div class="grid md:grid-cols-3 gap-4">
      <div>
        <h4 class="font-semibold mb-2">Gender-Based Violence</h4>
        <p class="text-sm opacity-90">FIDA Kenya: 0800 720 553</p>
      </div>
      <div>
        <h4 class="font-semibold mb-2">Substance Abuse</h4>
        <p class="text-sm opacity-90">NACADA: 0800 221 179</p>
      </div>
      <div>
        <h4 class="font-semibold mb-2">Student Counseling</h4>
        <p class="text-sm opacity-90">Available at Campus Wellness Center</p>
      </div>
    </div>
  </section>

  <!-- Community Guidelines -->
  <section class="text-center bg-gray-50 rounded-2xl p-8">
    <h2 class="text-2xl font-bold mb-4">Community Guidelines</h2>
    <p class="text-foreground/70 mb-6 max-w-2xl mx-auto">
      We're committed to maintaining a safe, respectful, and inclusive environment for all students. 
      Please familiarize yourself with our community guidelines.
    </p>
    <a href="/help" class="inline-flex items-center gap-2 px-6 py-3 rounded-lg border-2 border-gray-300 hover:border-blue-600 hover:text-blue-600 font-semibold transition-all">
      Read Guidelines
      <ExternalLink class="size-4" />
    </a>
  </section>
</main>
