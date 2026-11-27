import { jsonError, requireSiteAdmin } from "../../../../../../lib/private-delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024;

export async function POST(request, context) {
  const auth = await requireSiteAdmin(request);
  if (auth.error) return jsonError(auth.error, auth.status);
  const { id } = await context.params;
  const form = await request.formData();
  const kind = String(form.get("kind") || "photo");
  const preview = form.get("preview");
  const original = form.get("original");
  const watermarked = form.get("watermarked") === "true";
  if (!["photo", "video"].includes(kind)) return jsonError("Tipo de archivo no válido.");
  if (!watermarked || !(preview instanceof File) || !(original instanceof File)) {
    return jsonError("Debes adjuntar el original y una previsualización con marca de agua incrustada.");
  }
  if (!preview.size || !original.size || preview.size > MAX_FILE_SIZE || original.size > MAX_FILE_SIZE) {
    return jsonError("Los archivos deben pesar entre 1 byte y 2 GB.");
  }
  const allowed = kind === "photo"
    ? ["image/jpeg", "image/png", "image/webp"]
    : ["video/mp4", "video/webm", "video/quicktime"];
  if (!allowed.includes(preview.type) || !allowed.includes(original.type)) return jsonError("Formato de archivo no permitido.");
  const { data: gallery } = await auth.admin.from("client_galleries").select("id").eq("id", id).maybeSingle();
  if (!gallery) return jsonError("Galería no encontrada", 404);
  const extension = file => (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
  const base = id + "/" + crypto.randomUUID();
  const previewPath = base + "-preview." + extension(preview);
  const originalPath = base + "-original." + extension(original);
  const bucket = auth.admin.storage.from("ramss-deliveries");
  const first = await bucket.upload(previewPath, preview, { contentType: preview.type, upsert: false });
  if (first.error) return jsonError("No se pudo guardar la previsualización", 500);
  const second = await bucket.upload(originalPath, original, { contentType: original.type, upsert: false });
  if (second.error) {
    await bucket.remove([previewPath]);
    return jsonError("No se pudo guardar el original", 500);
  }
  if (kind === "photo") {
    const { error } = await auth.admin.from("gallery_assets").insert({
      gallery_id: id, asset_type: "photo", title: String(form.get("title") || "").slice(0, 160),
      original_path: originalPath, preview_path: previewPath, mime_type: original.type,
      file_size_bytes: original.size, sort_order: Number(form.get("sort_order")) || 0
    });
    if (error) {
      await bucket.remove([previewPath, originalPath]);
      return jsonError("No se pudo registrar la fotografía", 500);
    }
  } else {
    const { data: latest } = await auth.admin.from("gallery_video_versions")
      .select("version_number").eq("gallery_id", id).order("version_number", { ascending: false }).limit(1).maybeSingle();
    const versionNumber = (latest?.version_number || 0) + 1;
    await auth.admin.from("gallery_video_versions").update({ is_current: false }).eq("gallery_id", id);
    const { error } = await auth.admin.from("gallery_video_versions").insert({
      gallery_id: id, version_number: versionNumber, title: String(form.get("title") || "").slice(0, 160),
      preview_path: previewPath, original_path: originalPath, mime_type: original.type,
      file_size_bytes: original.size, duration_seconds: form.get("duration_seconds") ? Number(form.get("duration_seconds")) : null,
      is_current: true, uploaded_by: auth.user.id
    });
    if (error) {
      await bucket.remove([previewPath, originalPath]);
      return jsonError("No se pudo registrar la versión de vídeo", 500);
    }
  }
  await auth.admin.from("gallery_audit_events").insert({
    gallery_id: id, actor_user_id: auth.user.id, event_type: kind === "photo" ? "photo_uploaded" : "video_version_uploaded",
    details: { kind, original_size: original.size }
  });
  return Response.json({ ok: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
