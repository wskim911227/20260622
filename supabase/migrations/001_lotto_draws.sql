-- Supabase SQL Editor에서 실행하세요

create table if not exists public.lotto_draws (
  id uuid primary key default gen_random_uuid(),
  numbers integer[] not null,
  bonus integer,
  source text not null default 'draw' check (source in ('draw', 'saju')),
  saju_summary text,
  explanation text,
  created_at timestamptz not null default now(),
  constraint numbers_length check (array_length(numbers, 1) = 6),
  constraint bonus_range check (bonus is null or (bonus >= 1 and bonus <= 45))
);

create index if not exists lotto_draws_created_at_idx on public.lotto_draws (created_at desc);

alter table public.lotto_draws enable row level security;

create policy "Allow public read"
  on public.lotto_draws for select
  using (true);

create policy "Allow public insert"
  on public.lotto_draws for insert
  with check (true);
