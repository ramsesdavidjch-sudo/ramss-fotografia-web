import { getAdminClient, jsonError, resolveClientGallery } from "../../../../../../lib/private-delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, context) {
  const { slug, assetId } = await context.params;
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  const password = request.headers.get("x-gallery-password") || "";
  const admin = getAdminClient();
  const access = await resolveClientGallery(admin, slug, token, password);
  if (access.error) return jsonError(access.error, access.status);
  const gallery = access.gallery;
  if (gallery.payment_status !== "paid" || !gallery.delivery_released_at) return jsonError("Las descargas originales aún no están habilitadas.", 403);
  const { data: asset } = await admin.from("gallery_assets")
    .select("id, original_path, title").eq("id", assetId).eq("gallery_id", gallery.id).maybeSingle();
  const { data: video } = asset ? { data: null } : await admin.from("gallery_video_versions")
    .select("id, original_path, title").eq("id", assetId).eq("gallery_id", gallery.id).maybeSingle();
  const file = asset || video;
  if (!file) return jsonError("Archivo no encontrado", 404);
  const signed = await admin.storage.from("ramss-deliveries").createSignedUrl(file.original_path, 60, { download: true });
  if (signed.error) return jsonError("No se pudo preparar la descarga", 500);
  await admin.from("gallery_audit_events").insert({
    gallery_id: gallery.id, event_type: "original_download_authorized",
    details: { asset_id: file.id, kind: asset ? "photo" : "video" }
  });
  return Response.redirect(signed.data.signedUrl, 302);
}
