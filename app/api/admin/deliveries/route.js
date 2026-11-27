import { createAccessToken, getAdminClient, hashAccessToken, hashGalleryPassword, jsonError, requireSiteAdmin } from "../../../../lib/private-delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const auth = await requireSiteAdmin(request);
  if (auth.error) return jsonError(auth.error, auth.status);
  const { data, error } = await auth.admin
    .from("client_galleries")
    .select("id, title, description, slug, client_id, payment_status, delivery_released_at, expires_at, suspended_at, created_at, clients(id, full_name, email, phone)")
    .order("created_at", { ascending: false });
  if (error) return jsonError("No se pudieron cargar las entregas", 500);
  return Response.json({ galleries: data || [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request) {
  const auth = await requireSiteAdmin(request);
  if (auth.error) return jsonError(auth.error, auth.status);
  let body;
  try { body = await request.json(); } catch { return jsonError("Solicitud no válida"); }
  const fullName = String(body.full_name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const title = String(body.title || "").trim();
  if (!fullName || !email || !title) return jsonError("Nombre, correo y título son obligatorios.");
  if (fullName.length > 160 || email.length > 254 || title.length > 160) return jsonError("Uno de los campos supera el límite permitido.");
  if (body.password && String(body.password).length < 10) return jsonError("La contraseña de la galería debe tener al menos 10 caracteres.");
  const admin = auth.admin;
  let client;
  const existing = await admin.from("clients").select("id").eq("email", email).maybeSingle();
  if (existing.error) return jsonError("No se pudo comprobar el cliente", 500);
  if (existing.data) {
    client = existing.data;
    const updated = await admin.from("clients").update({ full_name: fullName, phone: String(body.phone || "").slice(0, 60) }).eq("id", client.id);
    if (updated.error) return jsonError("No se pudo actualizar el cliente", 500);
  } else {
    const inserted = await admin.from("clients").insert({ full_name: fullName, email, phone: String(body.phone || "").slice(0, 60) }).select("id").single();
    if (inserted.error) return jsonError("No se pudo crear el cliente", 500);
    client = inserted.data;
  }
  const token = createAccessToken();
  const slug = crypto.randomUUID();
  const passwordHash = await hashGalleryPassword(body.password ? String(body.password) : "");
  const created = await admin.from("client_galleries").insert({
    client_id: client.id,
    title,
    description: String(body.description || "").slice(0, 2000),
    slug,
    access_token_hash: hashAccessToken(token),
    password_hash: passwordHash,
    expires_at: body.expires_at || null,
    created_by: auth.user.id
  }).select("id, slug, title, expires_at").single();
  if (created.error) return jsonError("No se pudo crear la galería", 500);
  await admin.from("gallery_audit_events").insert({
    gallery_id: created.data.id,
    actor_user_id: auth.user.id,
    event_type: "gallery_created",
    details: { client_email: email }
  });
  const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  return Response.json({
    gallery: created.data,
    client_url: base + "/cliente/" + encodeURIComponent(slug) + "?token=" + encodeURIComponent(token)
  }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
