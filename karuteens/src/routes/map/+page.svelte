<script lang="ts">
  type Link = { href: string; label: string };
  const sections: { title: string; items: Link[] }[] = [
    { title: 'Core', items: [
      { href: '/', label: 'Landing' },
      { href: '/feed', label: 'Feed' },
      { href: '/profile', label: 'Profile' },
      { href: '/search', label: 'Search' },
      { href: '/notifications', label: 'Notifications' },
      { href: '/settings', label: 'Settings' }
    ]},
    { title: 'Social & Communication', items: [
      { href: '/messenger', label: 'Messenger' },
      { href: '/reels', label: 'Reels' },
      { href: '/watch', label: 'Watch' },
      { href: '/memories', label: 'Memories' }
    ]},
    { title: 'Community & Collaboration', items: [
      { href: '/groups', label: 'Groups' },
      { href: '/study-rooms', label: 'Study Rooms' },
      { href: '/pages', label: 'Pages' },
      { href: '/creator-studio', label: 'Creator Studio' },
      { href: '/events', label: 'Events' },
      { href: '/events/1', label: 'Event Detail (example)' },
      { href: '/campus', label: 'Campus Life Hub' },
      { href: '/study-buddy', label: 'AI Study Buddy' },
      { href: '/resources', label: 'Exam Resources' }
    ]},
    { title: 'Marketplace & Commerce', items: [
      { href: '/marketplace', label: 'Marketplace' },
      { href: '/marketplace/product/1', label: 'Product Detail (example)' },
      { href: '/seller', label: 'Seller Dashboard' },
      { href: '/cart', label: 'Cart' },
      { href: '/checkout', label: 'Checkout' },
      { href: '/payment', label: 'Payment' }
    ]},
    { title: 'Events & Entertainment', items: [
      { href: '/entertainment', label: 'Entertainment Arena' },
      { href: '/fundraisers', label: 'Fundraisers' }
    ]},
    { title: 'Education & Study Tools', items: [
      { href: '/study/dashboard', label: 'Study Dashboard' },
      { href: '/tutoring', label: 'Peer Tutoring' },
      { href: '/calendar', label: 'Study Calendar' },
      { href: '/notes', label: 'Collaboration Notes' },
      { href: '/leaderboards', label: 'Leaderboards' }
    ]},
    { title: 'Finance & Monetization', items: [
      { href: '/wallet', label: 'Payments & Wallet' },
      { href: '/ads', label: 'Ads Manager' },
      { href: '/revenue', label: 'Revenue Dashboard' },
      { href: '/premium', label: 'Premium Features' }
    ]},
    { title: 'Safety, Help & Admin', items: [
      { href: '/help', label: 'Help & Support' },
      { href: '/report', label: 'Report Center' },
      { href: '/safety', label: 'Safety Center' },
      { href: '/admin', label: 'Admin Dashboard' },
      { href: '/verify', label: 'Verification Portal' }
    ]},
    { title: 'PWA & System', items: [
      { href: '/language', label: 'Language & Region' }
    ]},
    { title: 'Legal', items: [
      { href: '/legal/terms', label: 'Terms of Service' },
      { href: '/legal/privacy', label: 'Privacy Policy' },
      { href: '/legal/cookies', label: 'Cookie Policy' }
    ]}
  ];
</script>

<main class="max-w-screen-lg mx-auto px-4 py-6 space-y-6">
  <h1 class="text-2xl font-semibold">Site Map</h1>
  <p class="text-foreground/70">Browse all available pages. Tap a link to navigate.</p>

  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {#each sections as sec}
      <section class="rounded-xl border bg-white p-4">
        <h2 class="text-lg font-medium mb-2">{sec.title}</h2>
        <ul class="space-y-1">
          {#each sec.items as it}
            <li>
              <a class="text-blue-700 hover:underline break-words" href={it.href}>{it.label}</a>
            </li>
          {/each}
        </ul>
      </section>
    {/each}
  </div>
</main>
