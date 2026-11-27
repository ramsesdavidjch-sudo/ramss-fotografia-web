# RamsS Fotografía — implementación de entregas privadas

## Estado
Esta arquitectura está preparada como base de datos aditiva; no se ha ejecutado contra Supabase. El proyecto Supabase debe estar activo antes de validar o aplicar el script.

## Componentes
- Clientes y galerías con enlaces de acceso revocables y fecha de expiración.
- Hash de token de acceso y hash de contraseña; nunca se almacena la contraseña en texto plano.
- Archivos originales y previsualizaciones bajo rutas privadas en el bucket `ramss-deliveries`.
- Versiones de video con reproducción de revisión protegida por marca de agua incrustada.
- Comentarios asociados a una versión y a un timestamp en milisegundos.
- Estados de comentarios: pendiente, en curso y resuelto.
- Aprobación de cliente por versión, separada del pago.
- Eventos manuales de pago y liberación, más auditoría de cambios.

## Reglas obligatorias del servidor
1. El cliente no consulta directamente las tablas de entregas ni el bucket privado.
2. Los Route Handlers validan el token, contraseña (si existe), expiración y suspensión.
3. Los Route Handlers verifican el usuario de Supabase Auth y su pertenencia a `admin_users` antes de cualquier acción administrativa.
4. La clave de servicio de Supabase solo existe en variables de entorno del servidor.
5. Una URL firmada de original se emite únicamente si el pago está marcado como pagado y la entrega fue liberada.
6. Los previews deben ser archivos derivados con la marca de agua realmente incrustada. Una capa CSS no protege un archivo original.
7. La aprobación audiovisual nunca libera originales.
8. La confirmación manual del pago y la liberación son acciones distintas, auditadas y reversibles por el administrador.

## Límite de esta etapa
El SQL crea la estructura y las políticas, pero no constituye por sí solo la aplicación. Aún deben implementarse y probarse las rutas de servidor, carga/derivación de medios, interfaz de administración, portal del cliente y controles de acceso. No ejecutar este script en producción hasta revisar el backup y reactivar el proyecto.
