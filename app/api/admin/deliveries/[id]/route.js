import { jsonError, requireSiteAdmin } from "../../../../../lib/private-delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request, context) {
  const auth = await requireSiteAdmin(request);
  if (auth.error) return jsonError(auth.error, auth.status);
  const { id } = await context.params;
  let body;
  try { body = await request.json(); } catch { return jsonError("Solicitud no válida"); }
  const admin = auth.admin;
  const { data: current, error: findError } = await admin.from("client_galleries")
    .select("id, payment_status, delivery_released_at, suspended_at").eq("id", id).maybeSingle();
  if (findError || !current) return jsonError("Galería no encontrada", 404);
  const changes = {};
  let eventType = "gallery_updated";
  if (body.action === "mark_paid") {
    changes.payment_status = "paid";
    eventType = "payment_marked_paid";
  } else if (body.action === "mark_refunded") {
    changes.payment_status = "refunded";
    changes.delivery_released_at = null;
    eventType = "payment_marked_refunded";
  } else if (body.action === "release_delivery") {
    if (current.payment_status !== "paid") return jsonError("Confirma el pago antes de liberar los originales.", 409);
    changes.delivery_released_at = new Date().toISOString();
    eventType = "delivery_released";
  } else if (body.action === "revoke_delivery") {
    changes.delivery_released_at = null;
    eventType = "delivery_revoked";
  } else if (body.action === "suspend") {
    changes.suspended_at = new Date().toISOString();
    eventType = "gallery_suspended";
  } else if (body.action === "restore") {
    changes.suspended_at = null;
    eventType = "gallery_restored";
  } else if (body.action === "set_expiry") {
    changes.expires_at = body.expires_at || null;
  } else {
    return jsonError("Acción no reconocida");
  }
  const { data, error } = await admin.from("client_galleries").update(changes).eq("id", id)
    .select("id, title, payment_status, delivery_released_at, expires_at, suspended_at").single();
  if (error) return jsonError("No se pudo actualizar la galería", 500);
  await admin.from("gallery_audit_events").insert({
    gallery_id: id, actor_user_id: auth.user.id, event_type: eventType,
    details: { action: body.action }
  });
  if (body.action === "mark_paid" || body.action === "mark_refunded") {
    await admin.from("gallery_payment_events").insert({
      gallery_id: id,
      event_type: body.action === "mark_paid" ? "payment_marked_paid" : "payment_marked_refunded",
      amount: body.amount == null ? null : Number(body.amount),
      currency: String(body.currency || "USD").slice(0, 8),
      reference: String(body.reference || "").slice(0, 160),
      notes: String(body.notes || "").slice(0, 1000),
      performed_by: auth.user.id
    });
  } else if (body.action === "release_delivery" || body.action === "revoke_delivery") {
    await admin.from("gallery_payment_events").insert({
      gallery_id: id, event_type: body.action === "release_delivery" ? "delivery_released" : "delivery_revoked",
      performed_by: auth.user.id
    });
  }
  return Response.json({ gallery: data }, { headers: { "Cache-Control": "no-store" } });
}
