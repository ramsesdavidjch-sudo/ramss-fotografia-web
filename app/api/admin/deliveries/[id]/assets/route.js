import { jsonError, requireSiteAdmin } from "../../../../../../lib/private-delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request, context) {
  const auth = await requireSiteAdmin(request);
  if (auth.error) return jsonError(auth.error, auth.status);
  const { id } = await context.params;
  let body;
  try { body = await request.json(); } catch { return jsonError("Solicitud no válida"); }
  const kind = body.kind === "video" ? "video" : body.kind === "photo" ? "photo" : null;
  if (!kind || body.watermarked !== true) return jsonError("Se requiere una previsualización con marca de agua incrustada.");
  const { data: gallery } = await auth.admin.from("client_galleries").select("id").eq("id", id).maybeSingle();
  if (!gallery) return jsonError("Galería no encontrada", 404);
  const paths = [body.preview_path, body.original_path];
  if (paths.some(path => typeof path !== "string" || !path.startsWith(id + "/"))) return jsonError("Rutas de archivo no válidas.");
  const bucket = auth.admin.storage.from("ramss-deliveries");
  const folder = await bucket.list(id);
  const existing = new Set((folder.data || []).map(item => id + "/" + item.name));
  if (folder.error || paths.some(path => !existing.has(path))) return jsonError("No se encontraron ambos archivos en el almacenamiento.", 409);
  if (kind === "photo") {
    const { error } = await auth.admin.from("gallery_assets").insert({
      gallery_id: id, asset_type: "photo", title: String(body.title || "").slice(0, 160),
      original_path: body.original_path, preview_path: body.preview_path,
      mime_type: String(body.original_mime || ""), file_size_bytes: Number(body.original_size) || 0,
      sort_order: Number(body.sort_order) || 0
    });
    if (error) return jsonError("No se pudo registrar la fotografía", 500);
  } else {
    const { data: latest } = await auth.admin.from("gallery_video_versions")
      .select("version_number").eq("gallery_id", id).order("version_number", { ascending: false }).limit(1).maybeSingle();
    const versionNumber = (latest?.version_number || 0) + 1;
    await auth.admin.from("gallery_video_versions").update({ is_current: false }).eq("gallery_id", id);
    const { error } = await auth.admin.from("gallery_video_versions").insert({
      gallery_id: id, version_number: versionNumber, title: String(body.title || "").slice(0, 160),
      preview_path: body.preview_path, original_path: body.original_path,
      mime_type: String(body.original_mime || ""), file_size_bytes: Number(body.original_size) || 0,
      duration_seconds: body.duration_seconds ? Number(body.duration_seconds) : null,
      is_current: true, uploaded_by: auth.user.id
    });
    if (error) return jsonError("No se pudo registrar la versión de vídeo", 500);
  }
  await auth.admin.from("gallery_audit_events").insert({
    gallery_id: id, actor_user_id: auth.user.id,
    event_type: kind === "photo" ? "photo_uploaded" : "video_version_uploaded",
    details: { kind, original_size: Number(body.original_size) || 0 }
  });
  return Response.json({ ok: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
