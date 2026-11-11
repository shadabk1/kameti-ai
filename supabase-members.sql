-- Run this in Supabase > SQL Editor. Free tier, no auth needed for the demo.
create table if not exists members (
  id bigint primary key,
  name text not null,
  history jsonb not null default '[]',
  paid_this_month boolean not null default false,
  created_at timestamptz not null default now()
);

-- Demo seed (matches src/demoData.js)
insert into members (id, name, history, paid_this_month) values
  (1, 'Ayesha', '["on-time","on-time","on-time","on-time"]', true),
  (2, 'Sumeet', '["on-time","on-time","late","on-time"]', true),
  (3, 'Bilal', '["on-time","late","late","missed"]', false),
  (4, 'Fatima', '["on-time","on-time","on-time"]', true),
  (5, 'Omar', '[]', false)
on conflict (id) do nothing;

-- For the hackathon demo, allow anon read/write. Turn RLS off for this table only.
alter table members disable row level security;
