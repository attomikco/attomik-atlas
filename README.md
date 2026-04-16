# Attomik Atlas

Brand management + AI content platform. Separate app from the main dashboard.

## Stack
- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Supabase (new project — PostgreSQL + Auth + Storage + RLS)
- Anthropic Claude API (brand-aware content generation)
- Resend (email sends, Phase 2)
- Vercel (hosting)

---

## Setup

### 1. Create a new Supabase project
Go to supabase.com → New project. Name it `attomik-marketing-os`.

### 2. Run the schema
In your Supabase dashboard → SQL Editor → paste and run `/supabase/schema.sql`.

### 3. Create the Storage bucket
Supabase dashboard → Storage → New bucket → name it `brand-assets` → **Private** (not public).

Set this Storage policy so authenticated users can upload:
```sql
create policy "authenticated upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'brand-assets');

create policy "authenticated read" on storage.objects
  for select to authenticated using (bucket_id = 'brand-assets');

create policy "authenticated delete" on storage.objects
  for delete to authenticated using (bucket_id = 'brand-assets');
```

### 4. Enable Auth
Supabase → Auth → Providers → Enable Email (magic link). 
Add your email under Auth → Users for initial access.

### 5. Clone and install
```bash
git clone https://github.com/attomikco/attomik-marketing-os
cd attomik-marketing-os
npm install
```

### 6. Environment variables
Copy `.env.local.example` to `.env.local` and fill in your values:
```bash
cp .env.local.example .env.local
```

### 7. Run locally
```bash
npm run dev
# → http://localhost:3000
```

### 8. Deploy to Vercel
```bash
vercel --prod
```
Add all env vars in Vercel dashboard → Project Settings → Environment Variables.

---

## Phases

### Phase 1 (this repo)
- Brand vault — client profiles, voice, colors, tone keywords
- Asset uploads — brand guidelines PDFs, HTML email templates
- AI Generate — brand-aware content (ad copy, social, email, SEO, DTC brief)

### Phase 2
- Email campaign scheduler (calendar view)
- Newsletter builder (Claude + your master HTML template)
- Resend integration for sends

### Phase 3
- Campaign analytics
- Client-facing approval portal
