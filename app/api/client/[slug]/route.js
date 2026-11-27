import { getAdminClient, jsonError, resolveClientGallery } from "../../../../lib/private-delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, context) {
  const { slug } = await context.params;
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  const password = request.headers.get("x-gallery-password") || "";
  let admin;
  try { admin = getAdminClient(); } catch (error) { return jsonError(error.message, 500); }
  const access = await resolveClientGallery(admin, slug, token, password);
  if (access.error) return jsonError(access.error, access.status);
  const gallery = access.gallery;
  const [assetsResult, videosResult] = await Promise.all([
    admin.from("gallery_assets").select("id, asset_type, title, preview_path, mime_type, file_size_bytes, sort_order").eq("gallery_id", gallery.id).order("sort_order"),
    admin.from("gallery_video_versions").select("id, version_number, title, preview_path, mime_type, duration_seconds, is_current, client_approved_at, created_at").eq("gallery_id", gallery.id).order("version_number", { ascending: false })
  ]);
  if (assetsResult.error || videosResult.error) return jsonError("No se pudo cargar el contenido de la galería", 500);
  const assets = await Promise.all((assetsResult.data || []).map(async item => {
    const signed = await admin.storage.from("ramss-deliveries").createSignedUrl(item.preview_path, 60 * 10);
    return { ...item, preview_url: signed.data?.signedUrl || null };
  }));
  const videos = await Promise.all((videosResult.data || []).map(async item => {
    const signed = await admin.storage.from("ramss-deliveries").createSignedUrl(item.preview_path, 60 * 10);
    return { ...item, preview_url: signed.data?.signedUrl || null };
  }));
  const comments = videos.length
    ? await admin.from("video_review_comments").select("id, version_id, timestamp_ms, body, status, admin_reply, created_at, replied_at").in("version_id", videos.map(v => v.id)).order("timestamp_ms")
    : { data: [] };
  return Response.json({
    gallery: {
      id: gallery.id, title: gallery.title, description: gallery.description,
      payment_status: gallery.payment_status,
      delivery_released: Boolean(gallery.delivery_released_at && gallery.payment_status === "paid"),
      expires_at: gallery.expires_at
    },
    assets, videos, comments: comments.data || []
  }, { headers: { "Cache-Control": "no-store" } });
}
