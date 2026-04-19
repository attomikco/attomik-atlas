-- Landing-previews Storage bucket — frozen HTML snapshot of a brand's
-- landing page preview. One file per brand at {brand_id}.html. Public
-- read so the /preview/:id iframe can load the URL directly; writes
-- gated to brand members via brand_members.
--
-- API routes that upload use the service-role admin client and bypass
-- RLS entirely (same pattern as /preview/[id]/page.tsx). These policies
-- are defense-in-depth for any future client-side upload path.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('landing-previews', 'landing-previews', true, 512000, array['text/html'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public SELECT — iframes on /preview/:id load the URL directly.
drop policy if exists "Public read landing-previews" on storage.objects;
create policy "Public read landing-previews" on storage.objects
  for select
  using (bucket_id = 'landing-previews');

-- Path format is {brand_id}.html. Uploader must be a member of the
-- brand whose id matches the file stem. brand_members is the authority
-- for brand access (CLAUDE.md + 20260413_brand_teams_fix.sql).
drop policy if exists "Members insert landing-previews" on storage.objects;
create policy "Members insert landing-previews" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'landing-previews'
    and exists (
      select 1 from public.brand_members bm
      where bm.user_id = auth.uid()
        and bm.brand_id::text = regexp_replace(name, '\.html$', '')
    )
  );

drop policy if exists "Members update landing-previews" on storage.objects;
create policy "Members update landing-previews" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'landing-previews'
    and exists (
      select 1 from public.brand_members bm
      where bm.user_id = auth.uid()
        and bm.brand_id::text = regexp_replace(name, '\.html$', '')
    )
  );

drop policy if exists "Members delete landing-previews" on storage.objects;
create policy "Members delete landing-previews" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'landing-previews'
    and exists (
      select 1 from public.brand_members bm
      where bm.user_id = auth.uid()
        and bm.brand_id::text = regexp_replace(name, '\.html$', '')
    )
  );
