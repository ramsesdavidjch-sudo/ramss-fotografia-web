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
  const admin = getAdminClient();
  const access = await resolveClientGallery(admin, slug, token, password);
  if (access.error) return jsonError(access.error, access.status);
  const { data: version } = await admin.from("gallery_video_versions").select("id")
    .eq("id", body.version_id).eq("gallery_id", access.gallery.id).maybeSingle();
  if (!version) return jsonError("Versión de vídeo no válida", 404);
  const { data, error } = await admin.from("gallery_video_versions")
    .update({ client_approved_at: new Date().toISOString() })
    .eq("id", version.id)
    .select("id, client_approved_at").single();
  if (error) return jsonError("No se pudo registrar la aprobación", 500);
  await admin.from("gallery_audit_events").insert({
    gallery_id: access.gallery.id, event_type: "video_version_approved",
    details: { version_id: version.id }
  });
  return Response.json({ approved: true, version: data }, { headers: { "Cache-Control": "no-store" } });
}
