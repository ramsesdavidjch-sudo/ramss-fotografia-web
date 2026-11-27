import { getAdminClient, jsonError, resolveClientGallery } from "../../../../../lib/private-delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request, context) {
  const { slug } = await context.params;
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  const password = request.headers.get("x-gallery-password") || "";
  let body;
  try { body = await request.json(); } catch { return jsonError("Solicitud no válida"); }
  const text = String(body.body || "").trim();
  if (!text || text.length > 1500) return jsonError("El comentario debe tener entre 1 y 1500 caracteres.");
  const admin = getAdminClient();
  const access = await resolveClientGallery(admin, slug, token, password);
  if (access.error) return jsonError(access.error, access.status);
  const { data: version } = await admin.from("gallery_video_versions")
    .select("id, duration_seconds").eq("id", body.version_id)
    .eq("gallery_id", access.gallery.id).maybeSingle();
  if (!version) return jsonError("Versión de vídeo no válida", 404);
  const timestamp = Math.max(0, Math.floor(Number(body.timestamp_ms) || 0));
  if (version.duration_seconds && timestamp > Number(version.duration_seconds) * 1000) return jsonError("El minuto indicado supera la duración del vídeo.");
  const { data, error } = await admin.from("video_review_comments").insert({
    version_id: version.id, timestamp_ms: timestamp, body: text
  }).select("id, version_id, timestamp_ms, body, status, admin_reply, created_at").single();
  if (error) return jsonError("No se pudo guardar el comentario", 500);
  await admin.from("gallery_audit_events").insert({
    gallery_id: access.gallery.id, event_type: "video_comment_added",
    details: { version_id: version.id, comment_id: data.id }
  });
  return Response.json({ comment: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
