-- RamsS Fotografía — infraestructura de entregas privadas y revisión audiovisual
-- Script aditivo. Revisar y ejecutar únicamente después de reactivar Supabase y hacer backup.
-- Los clientes nunca consultan estas tablas directamente: el acceso se valida en Route Handlers
-- del servidor usando un token aleatorio hasheado y una clave privada SOLO del servidor.

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text not null default '',
  internal_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clients_email_idx on public.clients (lower(email));

create table if not exists public.client_galleries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  title text not null,
  description text not null default '',
  slug text not null unique,
  access_token_hash text not null unique,
  password_hash text,
  payment_status text not null default 'pending'
    check (payment_status in ('pending','paid','refunded')),
  delivery_released_at timestamptz,
  expires_at timestamptz,
  suspended_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint released_only_after_payment
    check (delivery_released_at is null or payment_status = 'paid')
);

create index if not exists client_galleries_client_idx on public.client_galleries (client_id);
create index if not exists client_galleries_expiry_idx on public.client_galleries (expires_at)
  where expires_at is not null;

create table if not exists public.gallery_assets (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.client_galleries(id) on delete cascade,
  asset_type text not null default 'photo' check (asset_type in ('photo')),
  title text not null default '',
  original_path text not null,
  preview_path text not null,
  mime_type text not null,
  file_size_bytes bigint not null default 0 check (file_size_bytes >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists gallery_assets_order_idx
  on public.gallery_assets (gallery_id, sort_order);

create table if not exists public.gallery_video_versions (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.client_galleries(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  title text not null default '',
  preview_path text not null,
  original_path text not null,
  mime_type text not null,
  file_size_bytes bigint not null default 0 check (file_size_bytes >= 0),
  duration_seconds numeric(10,3),
  is_current boolean not null default false,
  client_approved_at timestamptz,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (gallery_id, version_number)
);

create index if not exists gallery_video_versions_current_idx
  on public.gallery_video_versions (gallery_id, is_current);

create table if not exists public.video_review_comments (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.gallery_video_versions(id) on delete cascade,
  timestamp_ms bigint not null check (timestamp_ms >= 0),
  body text not null,
  status text not null default 'pending'
    check (status in ('pending','in_progress','resolved')),
  admin_reply text not null default '',
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists video_review_comments_version_time_idx
  on public.video_review_comments (version_id, timestamp_ms);

create table if not exists public.gallery_payment_events (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.client_galleries(id) on delete cascade,
  event_type text not null check (event_type in ('payment_marked_paid','payment_marked_refunded','delivery_released','delivery_revoked')),
  amount numeric(10,2),
  currency text not null default 'USD',
  reference text not null default '',
  notes text not null default '',
  performed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists gallery_payment_events_gallery_idx
  on public.gallery_payment_events (gallery_id, created_at desc);

create table if not exists public.gallery_audit_events (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid references public.client_galleries(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists gallery_audit_events_gallery_idx
  on public.gallery_audit_events (gallery_id, created_at desc);

-- Los originales y las previsualizaciones se guardan en un bucket NO público.
insert into storage.buckets (id, name, public, file_size_limit)
values ('ramss-deliveries', 'ramss-deliveries', false, 2147483648)
on conflict (id) do update set public = false;

-- RLS: todas las tablas quedan cerradas por defecto para anon y authenticated.
-- La aplicación cliente no recibe permisos directos sobre las entregas.
do $$
declare
  t text;
begin
  foreach t in array array[
    'clients',
    'client_galleries',
    'gallery_assets',
    'gallery_video_versions',
    'video_review_comments',
    'gallery_payment_events',
    'gallery_audit_events'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "site admins manage %s" on public.%I', t, t);
    execute format(
      'create policy "site admins manage %s" on public.%I for all to authenticated using (public.is_site_admin()) with check (public.is_site_admin())',
      t, t
    );
  end loop;
end $$;

-- Acceso al bucket privado solo para administradores autenticados.
drop policy if exists "site admins read private deliveries" on storage.objects;
create policy "site admins read private deliveries"
  on storage.objects for select to authenticated
  using (bucket_id = 'ramss-deliveries' and public.is_site_admin());

drop policy if exists "site admins upload private deliveries" on storage.objects;
create policy "site admins upload private deliveries"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'ramss-deliveries' and public.is_site_admin());

drop policy if exists "site admins update private deliveries" on storage.objects;
create policy "site admins update private deliveries"
  on storage.objects for update to authenticated
  using (bucket_id = 'ramss-deliveries' and public.is_site_admin())
  with check (bucket_id = 'ramss-deliveries' and public.is_site_admin());

drop policy if exists "site admins delete private deliveries" on storage.objects;
create policy "site admins delete private deliveries"
  on storage.objects for delete to authenticated
  using (bucket_id = 'ramss-deliveries' and public.is_site_admin());

grant select, insert, update, delete on
  public.clients,
  public.client_galleries,
  public.gallery_assets,
  public.gallery_video_versions,
  public.video_review_comments,
  public.gallery_payment_events,
  public.gallery_audit_events
to authenticated;

-- NOTAS DE SEGURIDAD:
-- 1. Nunca guardar URLs públicas de originales; solo rutas de objetos privados.
-- 2. El servidor genera tokens aleatorios, guarda únicamente su hash y valida expiración/suspensión.
-- 3. Contraseñas: hash lento (Argon2id/bcrypt o PBKDF2 con parámetros fuertes) en servidor; nunca texto plano.
-- 4. El servidor solo firma URLs de originales cuando payment_status='paid' Y delivery_released_at IS NOT NULL.
-- 5. La aprobación del video no modifica el pago ni libera archivos.
-- 6. Los videos de revisión deben ser versiones ya exportadas con marca de agua incrustada.
-- 7. La clave service_role/secret se usa exclusivamente en Route Handlers; jamás NEXT_PUBLIC_.
