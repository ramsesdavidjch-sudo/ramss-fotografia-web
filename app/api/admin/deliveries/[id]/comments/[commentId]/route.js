import { jsonError, requireSiteAdmin } from "../../../../../../../lib/private-delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request, context) {
  const auth = await requireSiteAdmin(request);
  if (auth.error) return jsonError(auth.error, auth.status);
  const { id, commentId } = await context.params;
  let body;
  try { body = await request.json(); } catch { return jsonError("Solicitud no válida"); }
  const status = ["pending", "in_progress", "resolved"].includes(body.status) ? body.status : undefined;
  const reply = typeof body.admin_reply === "string" ? body.admin_reply.trim().slice(0, 1500) : undefined;
  if (status === undefined && reply === undefined) return jsonError("No hay cambios válidos");
  const { data: version } = await auth.admin.from("gallery_video_versions").select("id")
    .eq("gallery_id", id).eq("id", body.version_id).maybeSingle();
  if (!version) return jsonError("Versión no válida", 404);
  const changes = {};
  if (status !== undefined) changes.status = status;
  if (reply !== undefined) { changes.admin_reply = reply; changes.replied_at = new Date().toISOString(); }
  changes.updated_at = new Date().toISOString();
  const { data, error } = await auth.admin.from("video_review_comments").update(changes)
    .eq("id", commentId).eq("version_id", version.id)
    .select("id, version_id, timestamp_ms, body, status, admin_reply, replied_at").single();
  if (error) return jsonError("No se pudo actualizar el comentario", 500);
  await auth.admin.from("gallery_audit_events").insert({
    gallery_id: id, actor_user_id: auth.user.id, event_type: "video_comment_updated",
    details: { comment_id: commentId, status: data.status }
  });
  return Response.json({ comment: data }, { headers: { "Cache-Control": "no-store" } });
}
