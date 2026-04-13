-- Profiles table — one row per auth user, auto-created by a trigger on signup.
-- full_name is null until the user completes the first-name modal.

create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  job_title text,
  updated_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

-- Auto-create an empty profile row whenever a new auth user is created. The
-- client-side first-name modal fills in full_name on the user's first visit.
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Backfill: any existing auth users should get a profile row too, so this
-- feature works for users that signed up before the trigger existed.
insert into public.profiles (id)
select u.id from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
