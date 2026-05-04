-- =====================================================
-- مساحتي — Supabase Schema
-- شغّل هذا الملف في: Supabase Dashboard → SQL Editor
-- =====================================================

-- Cafes table
create table if not exists cafes (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  area            text not null,
  distance        text,
  open_time       text,
  close_time      text,
  friday_hours    text,
  total_seats     int default 0,
  free_seats      int default 0,
  private_seats   int default 0,
  wifi            text,
  charging        boolean default false,
  noise           text,
  rating          numeric(2,1) default 0,
  seats           text[] default '{}',
  -- Location
  maps_link       text,
  address         text,
  lat             numeric,
  lng             numeric,
  -- Contact & Social
  phone           text,
  instagram       text,
  description     text,
  -- Features
  has_parking     boolean default false,
  family_section  boolean default false,
  min_consumption text,
  payment_methods text[] default '{}',
  -- Management
  owner_id        uuid references auth.users(id) on delete set null,
  status          text default 'active',
  created_at      timestamptz default now()
);

-- Bookings table
create table if not exists bookings (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  cafe_name  text not null,
  time_slot  text not null,
  duration   int not null,
  seat_type  text not null,
  status     text default 'confirmed',
  created_at timestamptz default now()
);

-- Row Level Security
alter table cafes    enable row level security;
alter table bookings enable row level security;

-- Policies
create policy "Anyone can view active cafes"
  on cafes for select using (status = 'active' or auth.uid() = owner_id);

create policy "Users can submit cafes"
  on cafes for insert with check (auth.uid() = owner_id);

create policy "Owners can update their cafe"
  on cafes for update using (auth.uid() = owner_id);

create policy "Users can view own bookings"
  on bookings for select using (auth.uid() = user_id);

create policy "Users can insert own bookings"
  on bookings for insert with check (auth.uid() = user_id);

-- Sample data (نفس البيانات في التطبيق)
insert into cafes (name, area, distance, open_time, total_seats, free_seats, private_seats, wifi, charging, noise, rating, seats)
values
  ('كافيه السكون',       'حي النزهة', '2.1 كم', '7:00 ص', 12, 7,  2, 'سريع',     true,  'هادئ',      4.8,
   array['free','free','taken','free','private','private','taken','free','free','free','taken','free']),

  ('ورك هاوس',           'حي العليا', '3.4 كم', '8:00 ص', 10, 2,  1, 'متوسط',    true,  'متوسط',     4.3,
   array['taken','taken','taken','free','taken','private','taken','free','taken','taken']),

  ('ذا بودكاست لاونج',  'حي الملقا', '4.0 كم', '9:00 ص', 8,  0,  0, 'سريع',     false, 'هادئ جداً', 4.9,
   array['taken','taken','taken','taken','taken','taken','taken','taken']),

  ('بروان ستوديو',        'حي الروضة', '5.2 كم', '7:30 ص', 14, 10, 3, 'سريع جداً', true, 'هادئ',     4.6,
   array['free','free','free','taken','free','private','free','private','free','free','private','free','free','taken']);
