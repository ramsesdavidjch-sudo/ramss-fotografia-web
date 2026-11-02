# RamsS Fotografía — sitio web inicial

Sitio Next.js con estética editorial luxury, catálogo dinámico y panel privado conectado a Supabase.

## Requisitos
- Node.js 20 o superior
- Proyecto gratuito de Supabase

## 1. Instalar
```bash
npm install
```

## 2. Configurar Supabase
1. Crea un proyecto en https://supabase.com.
2. Abre SQL Editor y ejecuta todo `supabase/schema.sql`.
3. En Authentication, crea tu usuario administrador con tu correo y contraseña.
4. Copia el UUID del usuario desde Authentication > Users.
5. Ejecuta en SQL Editor:
   ```sql
   insert into public.admin_users (user_id) values ('TU-UUID');
   ```
6. Copia `.env.example` como `.env.local` y completa la URL del proyecto y la anon/publishable key desde Project Settings > API.

No compartas la `service_role` key ni la guardes en variables `NEXT_PUBLIC_`.

## 3. Ejecutar localmente
```bash
npm run dev
```
Abre http://localhost:3000. El administrador está en http://localhost:3000/admin.

## 4. Publicar
Puedes desplegar el proyecto en Vercel conectando el repositorio y configurando las mismas variables de entorno. El dominio propio puede añadirse después.

## Estado de esta primera entrega
Incluye portada, servicios, paquetes, portafolio, presentación, formulario de solicitudes y login de administrador. El panel inicial permite crear/eliminar servicios y paquetes y consultar solicitudes.

## Pendiente para una versión lista para producción
- Editor visual completo de textos y secciones.
- Carga, edición, eliminación y ordenamiento de imágenes desde el panel.
- Edición de paquetes existentes y administración de características.
- Configurar WhatsApp y correo reales.
- Añadir logo, fotografías, biografía, servicios y tarifas aprobadas.
- Pruebas de seguridad, accesibilidad, SEO y despliegue.

Los datos de demostración y las imágenes de referencia deben reemplazarse por material autorizado de RamsS Fotografía antes de publicar.
