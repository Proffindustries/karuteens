# KaruTeens — Web App (SvelteKit + TypeScript + TailwindCSS)

## Prerequisites
- Node.js 18+
- pnpm or npm (examples use pnpm)

## 1) Create the SvelteKit project (TypeScript)
```bash
# In this folder
pnpm create svelte@latest .
# Choose: Skeleton project, TypeScript, ESLint, Prettier (recommended)

pnpm install
```

## 2) Add TailwindCSS
Recommended (automatic):
```bash
npx svelte-add@latest tailwindcss
pnpm install
```
Manual (if you prefer):
- Install deps:
  ```bash
  pnpm add -D tailwindcss postcss autoprefixer
  npx tailwindcss init tailwind.config.cjs -p
  ```
- tailwind.config.cjs
  ```js
  /** @type {import('tailwindcss').Config} */
  export default {
    content: [
      './src/**/*.{html,js,svelte,ts}'
    ],
    theme: { extend: {} },
    plugins: []
  }
  ```
- src/app.css
  ```css
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
  ```
- src/routes/+layout.svelte
  ```svelte
  <script lang="ts"></script>
  <slot />
  <style global>
    @import '../app.css';
  </style>
  ```

## 3) Suggested project structure
```
project/
├─ src/
│  ├─ lib/
│  │  ├─ components/
│  │  └─ utils/
│  ├─ routes/
│  │  ├─ +layout.svelte
│  │  ├─ +layout.server.ts
│  │  ├─ +page.svelte
│  │  ├─ feed/+page.svelte
│  │  ├─ profile/+page.svelte
│  │  ├─ groups/+page.svelte
│  │  ├─ study-buddy/+page.svelte
│  │  ├─ resources/+page.svelte
│  │  ├─ notifications/+page.svelte
│  │  └─ settings/+page.svelte
│  └─ app.css
├─ static/
├─ .env.local
├─ svelte.config.js
├─ tailwind.config.cjs
├─ postcss.config.cjs
└─ package.json
```

## 4) Environment variables (.env.local)
Minimum for local dev (examples):
```
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
```
Do not commit secrets. Configure production env vars in Vercel.

## 5) Basic Supabase client
- Install: `pnpm add @supabase/supabase-js`
- src/lib/supabase.ts
  ```ts
  import { createClient } from '@supabase/supabase-js';

  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL as string;
  const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string;

  export const supabase = createClient(supabaseUrl, supabaseAnonKey);
  ```

## 6) Development scripts
```bash
pnpm dev       # start dev server
pnpm build     # production build
pnpm preview   # preview local production build
```

## 7) Optional UI components
- shadcn-svelte: https://ui.shadcn.com/svelte
- skeleton (tailwind): https://www.skeleton.dev/

## 8) Deployment (Vercel)
- Connect repo to Vercel
- Framework preset: SvelteKit
- Env vars: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, others as needed
- Set custom domain via Cloudflare DNS → Vercel

## 9) First routes to scaffold
- `/` (feed): list posts, create post form (stub)
- `/profile`: basic user profile
- `/groups`: groups list (stub)
- `/study-buddy`: AI UI stub
- `/resources`: exam resources list/detail (stub)
- `/notifications`: basic list
- `/settings`: profile + notification preferences

## 10) Next steps
- Add auth guard using Supabase Auth helpers for SvelteKit
- Create minimal DB tables: users, posts, comments, reactions, groups, resources
- Wire create/read server actions for posts and comments
- Add Tailwind themes and dark mode
