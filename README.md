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


## Portal de entregas privadas

La rama de trabajo incorpora un módulo de entregas privadas en `/admin/entregas` y un portal de cliente en `/cliente/[slug]`.

### Variables adicionales

Configura en el entorno local y en Vercel:

- `SUPABASE_SERVICE_ROLE_KEY`: clave secreta de servidor. **Nunca** debe llevar el prefijo `NEXT_PUBLIC_` ni enviarse al navegador.
- `NEXT_PUBLIC_SITE_URL`: URL pública del sitio para generar enlaces completos de galería.

La clave de servicio solo se utiliza en Route Handlers del servidor. Los clientes acceden a la galería con un token aleatorio cuyo hash se guarda en la base de datos. Las previsualizaciones se entregan con URL firmada de corta duración; los originales solo se firman cuando el pago está confirmado y la entrega se libera manualmente.

### Flujo de archivos

1. Crea la galería desde `/admin/entregas`.
2. Copia y comparte el enlace privado generado. Si configuraste contraseña, envíala por un canal separado.
3. Sube por separado el original y una previsualización con marca de agua ya incrustada. La carga utiliza URLs firmadas de Supabase Storage para no pasar archivos grandes por las funciones de Vercel.
4. Confirma manualmente el pago y luego libera las descargas originales.
5. Para revisión audiovisual, sube cada versión de vídeo con su previsualización protegida. Los comentarios del cliente quedan asociados a una versión y a un instante del vídeo.

**Importante:** el sistema exige una previsualización con marca de agua incrustada, pero la preparación de esa copia se realiza antes de subirla; no se debe tratar como una marca de agua generada automáticamente por el servidor. La prevención absoluta de capturas de pantalla o grabación externa no es técnicamente garantizable.

Antes de usarlo con clientes reales, configura las variables secretas, prueba el acceso con un enlace de prueba, revisa las políticas RLS y ejecuta las comprobaciones de seguridad y despliegue. No compartas enlaces privados en repositorios ni en registros públicos.
