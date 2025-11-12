<script lang="ts">
  import { Search, ChevronDown, MessageCircle, Mail, BookOpen, Users, Shield, Settings, HelpCircle } from 'lucide-svelte';

  let searchQuery = '';
  let selectedCategory = 'all';
  let expandedFaq: string | null = null;

  const categories = [
    { id: 'getting-started', name: 'Getting Started', icon: BookOpen },
    { id: 'account', name: 'Account & Profile', icon: Users },
    { id: 'privacy', name: 'Privacy & Security', icon: Shield },
    { id: 'features', name: 'Features', icon: Settings },
    { id: 'other', name: 'Other', icon: HelpCircle }
  ];

  const faqs = [
    {
      id: '1',
      category: 'getting-started',
      question: 'How do I create an account?',
      answer: 'Click the "Sign Up" button in the top right corner, enter your email and password, and verify your email address. You can also sign up using your Google account for faster registration.'
    },
    {
      id: '2',
      category: 'getting-started',
      question: 'How do I join a group?',
      answer: 'Navigate to the Groups page, browse available groups, and click "Join Group" on any group you\'re interested in. If the group is private, you\'ll need to wait for approval from the group creator.'
    },
    {
      id: '3',
      category: 'account',
      question: 'How do I update my profile?',
      answer: 'Click on your profile picture in the navigation bar, select "Profile", and click the edit icon. You can update your bio, avatar, social links, and privacy settings.'
    },
    {
      id: '4',
      category: 'account',
      question: 'How do I change my password?',
      answer: 'Go to Settings from your profile dropdown, navigate to the Security section, and click "Change Password". Enter your current password and your new password twice to confirm.'
    },
    {
      id: '5',
      category: 'privacy',
      question: 'Can I make my profile private?',
      answer: 'Yes! In your profile settings, toggle the "Private Profile" option. When your profile is private, only people you approve can see your posts and activities.'
    },
    {
      id: '6',
      category: 'privacy',
      question: 'How do I report inappropriate content?',
      answer: 'Click the three-dot menu on any post, comment, or message, and select "Report". Choose the reason for reporting and our moderation team will review it within 24 hours.'
    },
    {
      id: '7',
      category: 'features',
      question: 'How do I create a study room?',
      answer: 'Go to Study Rooms, click "Create Room", fill in the details (title, subject, description), and click create. You can then invite others to join your collaborative study session.'
    },
    {
      id: '8',
      category: 'features',
      question: 'How do I book a campus resource?',
      answer: 'Visit the Campus page, browse available resources (rooms, equipment, facilities), click "Book Now", select your date and time, and submit. You\'ll receive a confirmation when approved.'
    },
    {
      id: '9',
      category: 'features',
      question: 'How do I list an item in the marketplace?',
      answer: 'Navigate to Marketplace, click "Sell Item", upload photos, set your price and condition, add a description, and publish. Other students can then contact you about your listing.'
    },
    {
      id: '10',
      category: 'features',
      question: 'How do I message other users?',
      answer: 'Click on Messenger in the navigation, search for a user, and start a conversation. You can send text messages, images, and files. All conversations are private and encrypted.'
    },
    {
      id: '11',
      category: 'features',
      question: 'How do I RSVP to an event?',
      answer: 'Browse Events, click on an event you\'re interested in, and click "I\'m Going" or "I\'m Interested". You\'ll receive updates and reminders about the event.'
    },
    {
      id: '12',
      category: 'other',
      question: 'Is the platform free to use?',
      answer: 'Yes! All core features including groups, messaging, study rooms, events, and marketplace are completely free for students.'
    },
    {
      id: '13',
      category: 'other',
      question: 'How do I delete my account?',
      answer: 'Go to Settings → Account → Delete Account. Note that this action is permanent and cannot be undone. All your data will be removed from our servers.'
    },
    {
      id: '14',
      category: 'other',
      question: 'Can I use this on mobile?',
      answer: 'Yes! Our platform is fully responsive and works great on mobile browsers. We\'re also working on native mobile apps for iOS and Android.'
    }
  ];

  function toggleFaq(id: string) {
    expandedFaq = expandedFaq === id ? null : id;
  }

  $: filteredFaqs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
</script>

<main class="max-w-screen-xl mx-auto px-4 py-8 space-y-8">
  <div class="text-center space-y-3">
    <h1 class="text-4xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Help & Support</h1>
    <p class="text-foreground/70">Find answers to common questions or get in touch with our support team</p>
  </div>

  <!-- Search -->
  <section class="max-w-2xl mx-auto">
    <div class="relative">
      <Search class="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-foreground/40" />
      <input 
        class="w-full rounded-full border border-gray-300 pl-12 pr-4 py-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-lg" 
        placeholder="Search for help..."
        bind:value={searchQuery}
      />
    </div>
  </section>

  <!-- Quick Help Links -->
  <section class="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
    <a href="mailto:support@karuteens.com" class="rounded-2xl border bg-white p-6 hover:shadow-xl transition-all group">
      <Mail class="size-12 text-blue-600 mb-3 group-hover:scale-110 transition-transform" />
      <h3 class="font-bold text-lg mb-2">Email Support</h3>
      <p class="text-sm text-foreground/60">Get help via email within 24 hours</p>
    </a>
    
    <a href="/messenger" class="rounded-2xl border bg-white p-6 hover:shadow-xl transition-all group">
      <MessageCircle class="size-12 text-green-600 mb-3 group-hover:scale-110 transition-transform" />
      <h3 class="font-bold text-lg mb-2">Live Chat</h3>
      <p class="text-sm text-foreground/60">Chat with our support team</p>
    </a>
    
    <a href="/groups" class="rounded-2xl border bg-white p-6 hover:shadow-xl transition-all group">
      <Users class="size-12 text-purple-600 mb-3 group-hover:scale-110 transition-transform" />
      <h3 class="font-bold text-lg mb-2">Community</h3>
      <p class="text-sm text-foreground/60">Ask questions in community groups</p>
    </a>
  </section>

  <!-- Categories -->
  <section class="max-w-4xl mx-auto">
    <div class="flex flex-wrap gap-3 justify-center">
      <button 
        class="px-6 py-3 rounded-full font-medium transition-all {selectedCategory === 'all' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white border hover:border-blue-600'}"
        on:click={() => selectedCategory = 'all'}
      >
        All Topics
      </button>
      {#each categories as category}
        <button 
          class="px-6 py-3 rounded-full font-medium transition-all flex items-center gap-2 {selectedCategory === category.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-white border hover:border-blue-600'}"
          on:click={() => selectedCategory = category.id}
        >
          <svelte:component this={category.icon} class="size-4" />
          {category.name}
        </button>
      {/each}
    </div>
  </section>

  <!-- FAQs -->
  <section class="max-w-4xl mx-auto">
    <h2 class="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
    
    {#if filteredFaqs.length === 0}
      <div class="text-center py-12 bg-white rounded-2xl border">
        <HelpCircle class="size-16 mx-auto mb-4 text-foreground/30" />
        <h3 class="text-xl font-semibold mb-2">No results found</h3>
        <p class="text-foreground/60">Try adjusting your search or browse all topics</p>
      </div>
    {:else}
      <div class="space-y-3">
        {#each filteredFaqs as faq}
          <div class="rounded-xl border bg-white overflow-hidden hover:shadow-lg transition-all">
            <button 
              class="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              on:click={() => toggleFaq(faq.id)}
            >
              <span class="font-semibold pr-4">{faq.question}</span>
              <ChevronDown class="size-5 flex-shrink-0 transition-transform {expandedFaq === faq.id ? 'rotate-180' : ''}" />
            </button>
            
            {#if expandedFaq === faq.id}
              <div class="px-6 py-4 bg-gray-50 border-t">
                <p class="text-foreground/80">{faq.answer}</p>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <!-- Still Need Help -->
  <section class="max-w-2xl mx-auto text-center bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white">
    <h2 class="text-2xl font-bold mb-3">Still need help?</h2>
    <p class="mb-6 opacity-90">Our support team is here to assist you with any questions or issues</p>
    <div class="flex flex-col sm:flex-row gap-3 justify-center">
      <a href="mailto:support@karuteens.com" class="px-6 py-3 rounded-lg bg-white text-blue-600 font-semibold hover:shadow-lg transition-all">
        Contact Support
      </a>
      <a href="/feedback" class="px-6 py-3 rounded-lg border border-white/30 hover:bg-white/10 font-semibold transition-all">
        Send Feedback
      </a>
    </div>
  </section>
</main>
