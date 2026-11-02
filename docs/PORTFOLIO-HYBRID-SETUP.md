# RamsS Fotografía — actualización del portafolio híbrido

## Qué incluye esta rama

- Fotografías individuales con título, categoría, texto alternativo, orden y visibilidad.
- Proyectos editoriales con portada, descripción, categoría y galería ordenada.
- Panel privado en `/admin` para cargar imágenes a Supabase Storage, editar y eliminar contenido.
- Gestión de servicios y paquetes con edición.
- Solicitudes de clientes visibles en el panel.
- La web pública presenta proyectos editoriales y fotografías individuales por separado.
- Las fotografías que ya estaban en `public.gallery` se copian a `portfolio_images` al ejecutar la migración.

## Pasos necesarios en Supabase

1. Haz una copia de seguridad de la base de datos.
2. Abre Supabase → SQL Editor.
3. Revisa y ejecuta `supabase/portfolio-hybrid.sql`.
4. Confirma que existen las tablas `portfolio_images`, `portfolio_projects` y `portfolio_project_images`.
5. Confirma que el bucket público `ramss-portfolio` existe. El esquema inicial del proyecto lo crea; si no existe, créalo desde Storage antes de subir archivos.
6. Confirma que tu usuario autenticado tiene una fila en `public.admin_users`. El panel no concede privilegios automáticamente.

## Variables de entorno

Configura en local y en el proveedor de hosting:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (clave publishable/anon, nunca service_role ni secret key)

No subas `.env.local` al repositorio.

## Uso del panel

- Abre `/admin` e inicia sesión con el usuario administrador de Supabase Auth.
- En Portafolio → Fotografías individuales, carga una foto y completa categoría y texto alternativo.
- En Portafolio → Proyectos editoriales, crea un proyecto con portada y descripción.
- En Gestionar imágenes, selecciona varias fotografías para añadirlas a ese proyecto.
- Usa el control de visibilidad y orden para decidir qué aparece y en qué secuencia.

## Validaciones recomendadas antes de publicar

- Ejecutar `npm install` y `npm run build`.
- Probar login, subida, edición, eliminación y cierre de sesión.
- Comprobar RLS con una sesión anónima: no debe poder insertar, actualizar ni eliminar contenido.
- Probar el formulario público de solicitudes.
- Verificar la experiencia móvil y textos alternativos de las imágenes.

## Límites conocidos

- Las solicitudes de clientes todavía no tienen estados (nuevo, contactado, cerrado).
- No hay optimización automática ni conversión de imágenes a WebP/AVIF durante la subida.
- La eliminación de un proyecto borra sus filas de galería por cascada; los archivos de Storage asociados pueden necesitar limpieza manual.
- La seguridad antispam del formulario requiere una capa de servidor con rate limiting y validación adicional antes de producción.
