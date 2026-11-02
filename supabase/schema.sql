-- RamsS Fotografía: esquema inicial de Supabase
-- Ejecuta este archivo en Supabase > SQL Editor.
create extension if not exists "pgcrypto";

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  price_from text default 'Consultar',
  image_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  category text default 'Paquete',
  price numeric(10,2),
  features jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.gallery (
  id uuid primary key default gen_random_uuid(),
  title text default '',
  image_url text not null,
  category text default '',
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  service text default '',
  details text not null,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
alter table public.services enable row level security;
alter table public.packages enable row level security;
alter table public.gallery enable row level security;
alter table public.inquiries enable row level security;

create or replace function public.is_site_admin()
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists(select 1 from public.admin_users where user_id = auth.uid());
$$;

create policy "public reads active services" on public.services for select using (is_active = true or public.is_site_admin());
create policy "admins manage services" on public.services for all using (public.is_site_admin()) with check (public.is_site_admin());
create policy "public reads active packages" on public.packages for select using (is_active = true or public.is_site_admin());
create policy "admins manage packages" on public.packages for all using (public.is_site_admin()) with check (public.is_site_admin());
create policy "public reads visible gallery" on public.gallery for select using (is_visible = true or public.is_site_admin());
create policy "admins manage gallery" on public.gallery for all using (public.is_site_admin()) with check (public.is_site_admin());
create policy "visitors submit inquiries" on public.inquiries for insert with check (true);
create policy "admins read inquiries" on public.inquiries for select using (public.is_site_admin());
create policy "admins delete inquiries" on public.inquiries for delete using (public.is_site_admin());

insert into storage.buckets (id, name, public)
values ('ramss-portfolio', 'ramss-portfolio', true)
on conflict (id) do nothing;

create policy "public view portfolio images" on storage.objects for select
using (bucket_id = 'ramss-portfolio');
create policy "admins upload portfolio images" on storage.objects for insert
with check (bucket_id = 'ramss-portfolio' and public.is_site_admin());
create policy "admins update portfolio images" on storage.objects for update
using (bucket_id = 'ramss-portfolio' and public.is_site_admin())
with check (bucket_id = 'ramss-portfolio' and public.is_site_admin());
create policy "admins delete portfolio images" on storage.objects for delete
using (bucket_id = 'ramss-portfolio' and public.is_site_admin());

-- Tras crear tu usuario en Supabase Authentication, añade su UUID:
-- insert into public.admin_users (user_id) values ('PEGA-AQUI-TU-UUID');
