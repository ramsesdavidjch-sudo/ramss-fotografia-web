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
  if (!kind) return jsonError("Tipo de archivo no válido.");
  const allowed = kind === "photo" ? ["image/jpeg", "image/png", "image/webp"] : ["video/mp4", "video/webm", "video/quicktime"];
  if (!allowed.includes(body.original_mime) || !allowed.includes(body.preview_mime)) return jsonError("Formato de archivo no permitido.");
  const { data: gallery } = await auth.admin.from("client_galleries").select("id").eq("id", id).maybeSingle();
  if (!gallery) return jsonError("Galería no encontrada", 404);
  const base = id + "/" + crypto.randomUUID();
  const safeExt = value => String(value || "bin").split("/").pop().split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
  const previewPath = base + "-preview." + safeExt(body.preview_name);
  const originalPath = base + "-original." + safeExt(body.original_name);
  const bucket = auth.admin.storage.from("ramss-deliveries");
  const [preview, original] = await Promise.all([
    bucket.createSignedUploadUrl(previewPath, { upsert: false }),
    bucket.createSignedUploadUrl(originalPath, { upsert: false })
  ]);
  if (preview.error || original.error) return jsonError("No se pudieron preparar las cargas seguras", 500);
  return Response.json({
    preview: { path: previewPath, token: preview.data.token },
    original: { path: originalPath, token: original.data.token }
  }, { headers: { "Cache-Control": "no-store" } });
}
