# KaruTeens — MVP Specification

## Tech Stack
- **Framework**: SvelteKit
- **Language**: TypeScript
- **UI**: TailwindCSS

## Principles
- Mobile-first and responsive
- Fast and secure by default
- Privacy-first and accessible (WCAG-minded)

## Minimal Online Services
- **Hosting/CI**: Vercel
- **Database/Auth/Realtime**: Supabase (Postgres + Auth + Realtime)
- **DNS/CDN**: Cloudflare
- **Email (transactional)**: Brevo
- **Images (storage/transform)**: Cloudinary
- **Push notifications**: Firebase Cloud Messaging (FCM)
- **Product analytics**: PostHog
- **Error tracking**: Sentry

## MVP Pages
- **Home / Feed**: Posts list with create post, comments, reactions.
- **Profile**: Basic user profile with posts and about info.
- **Groups (basic)**: Join/view groups, simple posting.
- **AI Study Buddy (stub)**: UI stub; backend integration later.
- **Exam Resources (basic)**: Listing + detail for past papers/resources.
- **Notifications**: In-app alerts for comments/reactions/tags.
- **Settings**: Profile, privacy basics, notification preferences.

## Architecture (brief)
- **Routing**: SvelteKit filesystem routes (`+page.svelte`, `+page.server.ts`).
- **Data**: Supabase tables for `users`, `posts`, `comments`, `reactions`, `groups`, `resources`.
- **Auth**: Supabase Auth (email OTP). Protect server actions and endpoints.
- **Realtime**: Supabase Realtime for feed updates and notifications.
- **Storage**: Cloudinary for images; store URLs in Postgres.
- **Email**: Brevo for verification and transactional emails.
- **Push**: FCM for web push (optional in MVP, enabled later).

## Styling
- TailwindCSS utility-first styling.
- Optional component layer (e.g., shadcn/ui for Svelte) if needed.
- Dark mode support via class strategy.

## Accessibility
- Semantic HTML, focus outlines, color-contrast safe palette.
- Alt text for images; form labels and ARIA where appropriate.

## Environment & Secrets
- `.env` (not committed) for Supabase, Brevo, Cloudinary, FCM, Sentry, PostHog.
- Never hardcode secrets; use project/environment settings in Vercel.

## Deployment
- Vercel Preview for pull requests; Production on `main`.
- Domain `karuteens.site` via Cloudflare DNS → Vercel.

## Out of Scope for MVP (Roadmap)
- Marketplace and orders
- Full Events suite and ticketing
- Messenger voice/video calls and livestreaming
- Ads/monetization and business suite
- Advanced admin analytics and moderation dashboards

## Notes
- Start with mobile layouts; scale up to desktop.
- Prioritize fast TTFB, image optimization, and caching.

