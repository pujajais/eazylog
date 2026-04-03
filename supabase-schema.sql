-- EazyLog Supabase Schema
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Quick tap presets per user
create table public.quick_tap_presets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  label text not null,
  icon text not null default 'circle',
  color text not null default '#5B8C7B',
  sort_order int not null default 0,
  created_at timestamptz default now() not null
);

-- Symptom entries (the core data)
create table public.symptom_entries (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  raw_text text,
  body_locations text[] default '{}',
  pain_type text,
  severity int check (severity >= 1 and severity <= 10),
  triggers text[] default '{}',
  is_chronic boolean default false,
  notes text,
  source text not null default 'log', -- 'log', 'quick-tap', 'body-map'
  created_at timestamptz default now() not null
);

-- Follow-up Q&A stored per entry
create table public.follow_ups (
  id uuid default uuid_generate_v4() primary key,
  entry_id uuid references public.symptom_entries(id) on delete cascade not null,
  question text not null,
  answer text,
  created_at timestamptz default now() not null
);

-- Doctor reports
create table public.doctor_reports (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  report_text text not null,
  date_range_start timestamptz,
  date_range_end timestamptz,
  created_at timestamptz default now() not null
);

-- Indexes for performance
create index idx_symptom_entries_user_id on public.symptom_entries(user_id);
create index idx_symptom_entries_created_at on public.symptom_entries(created_at desc);
create index idx_quick_tap_presets_user_id on public.quick_tap_presets(user_id);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.quick_tap_presets enable row level security;
alter table public.symptom_entries enable row level security;
alter table public.follow_ups enable row level security;
alter table public.doctor_reports enable row level security;

-- Profiles: users can only read/update their own profile
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Quick tap presets: users manage their own
create policy "Users can view own presets"
  on public.quick_tap_presets for select using (auth.uid() = user_id);

create policy "Users can insert own presets"
  on public.quick_tap_presets for insert with check (auth.uid() = user_id);

create policy "Users can update own presets"
  on public.quick_tap_presets for update using (auth.uid() = user_id);

create policy "Users can delete own presets"
  on public.quick_tap_presets for delete using (auth.uid() = user_id);

-- Symptom entries: users manage their own
create policy "Users can view own entries"
  on public.symptom_entries for select using (auth.uid() = user_id);

create policy "Users can insert own entries"
  on public.symptom_entries for insert with check (auth.uid() = user_id);

create policy "Users can update own entries"
  on public.symptom_entries for update using (auth.uid() = user_id);

create policy "Users can delete own entries"
  on public.symptom_entries for delete using (auth.uid() = user_id);

-- Follow-ups: accessible if user owns the parent entry
create policy "Users can view own follow-ups"
  on public.follow_ups for select using (
    exists (
      select 1 from public.symptom_entries
      where symptom_entries.id = follow_ups.entry_id
      and symptom_entries.user_id = auth.uid()
    )
  );

create policy "Users can insert own follow-ups"
  on public.follow_ups for insert with check (
    exists (
      select 1 from public.symptom_entries
      where symptom_entries.id = follow_ups.entry_id
      and symptom_entries.user_id = auth.uid()
    )
  );

-- Doctor reports: users manage their own
create policy "Users can view own reports"
  on public.doctor_reports for select using (auth.uid() = user_id);

create policy "Users can insert own reports"
  on public.doctor_reports for insert with check (auth.uid() = user_id);

create policy "Users can delete own reports"
  on public.doctor_reports for delete using (auth.uid() = user_id);

-- Function to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to seed default quick tap presets for new users
create or replace function public.seed_default_presets()
returns trigger as $$
begin
  insert into public.quick_tap_presets (user_id, label, icon, color, sort_order) values
    (new.id, 'Migraine', 'brain', '#D4956A', 0),
    (new.id, 'Nausea', 'frown', '#D4956A', 1),
    (new.id, 'Back Pain', 'arrow-down', '#D4956A', 2),
    (new.id, 'Fatigue', 'battery-low', '#D4956A', 3),
    (new.id, 'Joint Pain', 'bone', '#D4956A', 4),
    (new.id, 'Feeling OK', 'smile', '#5B8C7B', 5);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute procedure public.seed_default_presets();
