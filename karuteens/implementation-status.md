# Implementation Status – KaruTeens

## Summary
- This document tracks what is implemented, partially implemented, and pending, based on the current plan in planned website details.md.

## Implemented
- Auth: Supabase Auth and session handling (`src/hooks.server.ts`, `$lib/supabase/*`).
- Uploads: File upload APIs to Cloudflare R2
  - `/src/routes/api/upload/+server.ts`
  - `/src/routes/api/groups/upload-media/+server.ts`
  - `/src/routes/api/upload-avatar/+server.ts`
- Database (base): `posts`, `profiles`, `pages` with RLS; `pages` on realtime publication.
- UI: Events pages exist (list/detail/edit) under `/events`.

## Implemented but not complete
- Events feature
  - Missing DB tables: `events`, `event_attendees`, `event_comments` (with RLS, publication).
  - Missing API: `/src/routes/api/events/*` (CRUD, RSVP, comments) with validation and auth guards.
  - Missing realtime: subscriptions in UI for comments/attendees and optimistic updates.
  - Missing security: RBAC roles and per-IP/user rate limiting for event management.
- Realtime coverage
  - Enabled for some tables, but events-related streams not wired in UI.

## Pending / Not implemented yet
- Security & Ops
  - RBAC model (roles/permissions) and middleware checks.
  - Rate limiting middleware.
- PWA & Push
  - `manifest.webmanifest`, service worker, offline shell.
  - FCM web push (client token registration + server send endpoint).
- Analytics / Monitoring / Consent
  - PostHog analytics, Sentry error tracking, consent/cookie banner.
- Payments (skeleton)
  - M-Pesa sandbox endpoints: `/api/payments/mpesa/init` and `/callback`, ENV keys, logging.
- Admin basics (later phase)
  - Tables: `reports`, `enforcement_actions`, `audit_logs`; minimal admin UI; RBAC on admin routes.
- Broader features listed for future phases
  - Marketplace, Watch/Video, Reels/Stories, Livestreaming, Creator Studio, Jobs, Help & Support.
  - Study groups advanced tooling, campus integrations, gamification, verification, enhanced safety measures.
  - API strategy (public API, webhooks, SDK), acquisition/community programs.
  - Scalability stack (queues, caching layers, sharding), performance optimizations, LMS/university integrations.

## Route coverage (pages)
  
  - Present
    - Landing (`/`), Feed (`/feed`), Profile (`/profile`), Pages (`/pages`), Groups (`/groups`)
    - Marketplace (`/marketplace`), Seller (`/seller`), Cart (`/cart`), Checkout (`/checkout`)
    - Events (`/events`), Watch (`/watch`), Reels (`/reels`), Messenger (`/messenger`)
    - Notifications (`/notifications`), Search (`/search`)
    - Settings (`/settings`), Safety (`/safety`), Legal (`/legal`), Help (`/help`), Report (`/report`)
    - Creator Studio (`/creator-studio`), Fundraisers (`/fundraisers`), Memories (`/memories`)
    - AI Study Buddy (`/study-buddy`), Resources (`/resources`), Entertainment (`/entertainment`)
    - Study Rooms (`/study-rooms`), Study (`/study`), Tutoring (`/tutoring`)
    - Payments (`/payment`), Wallet (`/wallet`), Admin (`/admin`), Ads (`/ads`), Revenue (`/revenue`)
    - Auth: Login (`/login`), Signup (`/signup`), Verify (`/verify`)
    - Others: Calendar (`/calendar`), Campus (`/campus`), Language (`/language`), Leaderboards (`/leaderboards`), Notes (`/notes`), Premium (`/premium`), Map (`/map`)
  
  - Missing (not found as dedicated routes)
    - Saved/bookmarks (`/saved`)
    - Jobs (`/jobs`)
    - Stories (separate from Reels) (`/stories`)
    - Business Suite / Ads Manager (explicit) (`/business-suite` or `/ads-manager`) — you have `/ads` and `/revenue`
    - Donate (explicit page) (`/donate`) — you have `/fundraisers`
  
  - Notes
    - Some planned areas may be consolidated (e.g., Donate within Fundraisers, Stories within Reels). If intentional, update the plan to reflect the consolidated routes.

## Recommended next actions (execution order)
1) Schema: add `events`, `event_attendees`, `event_comments` with RLS + publication; run migrations.
2) API: implement `/api/events/*` with validation, auth guards, and rate limiting.
3) UI: wire `/events` pages to the API; add forms/validation; optimistic updates.
4) Realtime: subscribe to comments/attendees channels; update UI live.
5) Security: introduce RBAC roles and guards; add tests for permissions.
6) PWA/Push: manifest, service worker; FCM client opt-in + `/api/notifications/register`.
7) Ops: add PostHog, Sentry, and consent banner; verify in staging.
8) Payments: scaffold M-Pesa sandbox endpoints and minimal UI placeholders.
