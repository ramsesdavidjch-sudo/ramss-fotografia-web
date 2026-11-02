-- RamsS Fotografía · Portafolio híbrido
-- Ejecutar manualmente en Supabase SQL Editor después de revisar y respaldar la base.
-- Mantiene public.gallery intacta para compatibilidad con el sitio actual.

create table if not exists public.portfolio_images (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  image_url text not null,
  category text not null default 'Retratos',
  alt_text text not null default '',
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.portfolio_projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text not null default '',
  cover_image_url text not null,
  category text not null default 'Editorial',
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portfolio_project_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.portfolio_projects(id) on delete cascade,
  image_url text not null,
  alt_text text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists portfolio_images_visible_order_idx
  on public.portfolio_images (is_visible, sort_order);
create index if not exists portfolio_projects_visible_order_idx
  on public.portfolio_projects (is_visible, sort_order);
create index if not exists portfolio_project_images_project_order_idx
  on public.portfolio_project_images (project_id, sort_order);

alter table public.portfolio_images enable row level security;
alter table public.portfolio_projects enable row level security;
alter table public.portfolio_project_images enable row level security;

drop policy if exists "public reads visible portfolio images" on public.portfolio_images;
create policy "public reads visible portfolio images"
  on public.portfolio_images for select to anon, authenticated
  using (is_visible = true or public.is_site_admin());

drop policy if exists "admins manage portfolio images v2" on public.portfolio_images;
create policy "admins manage portfolio images v2"
  on public.portfolio_images for all to authenticated
  using (public.is_site_admin()) with check (public.is_site_admin());

drop policy if exists "public reads visible portfolio projects" on public.portfolio_projects;
create policy "public reads visible portfolio projects"
  on public.portfolio_projects for select to anon, authenticated
  using (is_visible = true or public.is_site_admin());

drop policy if exists "admins manage portfolio projects" on public.portfolio_projects;
create policy "admins manage portfolio projects"
  on public.portfolio_projects for all to authenticated
  using (public.is_site_admin()) with check (public.is_site_admin());

drop policy if exists "public reads images of visible projects" on public.portfolio_project_images;
create policy "public reads images of visible projects"
  on public.portfolio_project_images for select to anon, authenticated
  using (
    exists (
      select 1 from public.portfolio_projects p
      where p.id = project_id and (p.is_visible = true or public.is_site_admin())
    )
  );

drop policy if exists "admins manage project images" on public.portfolio_project_images;
create policy "admins manage project images"
  on public.portfolio_project_images for all to authenticated
  using (public.is_site_admin()) with check (public.is_site_admin());

grant select on public.portfolio_images, public.portfolio_projects, public.portfolio_project_images to anon, authenticated;
grant insert, update, delete on public.portfolio_images, public.portfolio_projects, public.portfolio_project_images to authenticated;

-- El bucket ramss-portfolio ya se crea en schema.sql.
-- No se cambia su visibilidad ni se exponen claves privadas.

-- Importa las fotografías antiguas sin duplicar URLs ya migradas.
insert into public.portfolio_images (title, image_url, category, alt_text, is_visible, sort_order, created_at)
select coalesce(g.title, ''), g.image_url, coalesce(nullif(g.category, ''), 'General'),
       coalesce(g.title, ''), g.is_visible, g.sort_order, g.created_at
from public.gallery g
where not exists (
  select 1 from public.portfolio_images pi where pi.image_url = g.image_url
);


-- Configuración editable del sitio (contenido institucional, contacto y SEO).
create table if not exists public.site_settings (
  id integer primary key default 1 check (id = 1),
  brand_name text not null default 'RamsS Fotografía',
  tagline text not null default 'Fotografía · Dirección creativa · Contenido',
  hero_title text not null default 'Imágenes que permanecen.',
  hero_description text not null default 'Una mirada visual cuidada para contar historias, preservar momentos y construir identidades.',
  intro_title text not null default 'La fotografía como lenguaje propio.',
  intro_description text not null default 'Cada proyecto merece una intención, una estética y una historia. Trabajo desde una perspectiva visual que combina sensibilidad, composición y atención al detalle.',
  about_title text not null default 'Hola, soy Ramses.',
  about_description text not null default 'Fotógrafo enfocado en crear imágenes con identidad, intención y cuidado por los detalles. Este espacio reúne mi trabajo y las distintas formas en las que puedo ayudarte a contar tu historia.',
  contact_title text not null default 'Hablemos de tu proyecto.',
  contact_description text not null default 'Cuéntame qué necesitas. Te responderé para conversar sobre disponibilidad, ideas y presupuesto.',
  contact_email text not null default '',
  contact_phone text not null default '',
  whatsapp_number text not null default '',
  instagram_url text not null default 'https://www.instagram.com/ramssfotografia/',
  location_text text not null default '',
  business_hours text not null default '',
  seo_title text not null default 'RamsS Fotografía',
  seo_description text not null default 'Fotografía, dirección creativa y contenido visual.',
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id) values (1) on conflict (id) do nothing;
alter table public.site_settings enable row level security;

drop policy if exists "public reads site settings" on public.site_settings;
create policy "public reads site settings" on public.site_settings
  for select to anon, authenticated using (true);

drop policy if exists "admins update site settings" on public.site_settings;
create policy "admins update site settings" on public.site_settings
  for all to authenticated using (public.is_site_admin()) with check (public.is_site_admin());

grant select on public.site_settings to anon, authenticated;
grant insert, update, delete on public.site_settings to authenticated;

alter table public.site_settings
  add column if not exists hero_image_url text not null default '',
  add column if not exists about_image_url text not null default '',
  add column if not exists footer_text text not null default '';


-- Administración ampliada: contacto, redes, visibilidad de secciones y CRM de solicitudes.
alter table public.site_settings
  add column if not exists facebook_url text not null default '',
  add column if not exists tiktok_url text not null default '',
  add column if not exists pinterest_url text not null default '',
  add column if not exists contact_address text not null default '',
  add column if not exists service_area text not null default '',
  add column if not exists google_maps_url text not null default '',
  add column if not exists contact_form_enabled boolean not null default true,
  add column if not exists show_portfolio boolean not null default true,
  add column if not exists show_services boolean not null default true,
  add column if not exists show_packages boolean not null default true,
  add column if not exists show_about boolean not null default true,
  add column if not exists announcement_enabled boolean not null default false,
  add column if not exists announcement_text text not null default '';

alter table public.inquiries
  add column if not exists status text not null default 'new'
    check (status in ('new','contacted','quoted','closed')),
  add column if not exists admin_notes text not null default '',
  add column if not exists updated_at timestamptz not null default now();

drop policy if exists "admins update inquiries" on public.inquiries;
create policy "admins update inquiries" on public.inquiries
  for update to authenticated using (public.is_site_admin())
  with check (public.is_site_admin());

grant update on public.inquiries to authenticated;
