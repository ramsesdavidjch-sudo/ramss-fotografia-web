import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

export function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export function hashAccessToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function createAccessToken() {
  return randomBytes(32).toString("base64url");
}

export async function hashGalleryPassword(password) {
  if (!password) return null;
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64);
  return "scrypt$" + salt.toString("hex") + "$" + Buffer.from(derived).toString("hex");
}

export async function verifyGalleryPassword(password, stored) {
  if (!stored) return true;
  if (!password || typeof password !== "string") return false;
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  try {
    const expected = Buffer.from(parts[2], "hex");
    const actual = Buffer.from(await scrypt(password, Buffer.from(parts[1], "hex"), expected.length));
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export async function requireSiteAdmin(request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return { error: "No autenticado", status: 401 };
  const admin = getAdminClient();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData?.user) return { error: "Sesión no válida", status: 401 };
  const { data: record, error } = await admin
    .from("admin_users")
    .select("user_id")
    .eq("user_id", authData.user.id)
    .maybeSingle();
  if (error || !record) return { error: "No autorizado", status: 403 };
  return { admin, user: authData.user };
}

export async function resolveClientGallery(admin, slug, token, password) {
  if (!slug || !token) return { error: "Enlace incompleto", status: 404 };
  const { data: gallery, error } = await admin
    .from("client_galleries")
    .select("id, client_id, title, description, slug, access_token_hash, password_hash, payment_status, delivery_released_at, expires_at, suspended_at, created_at")
    .eq("slug", slug)
    .eq("access_token_hash", hashAccessToken(token))
    .maybeSingle();
  if (error || !gallery) return { error: "Enlace no válido", status: 404 };
  if (gallery.suspended_at) return { error: "Este enlace está suspendido", status: 410 };
  if (gallery.expires_at && new Date(gallery.expires_at).getTime() <= Date.now()) return { error: "Este enlace ha expirado", status: 410 };
  if (!(await verifyGalleryPassword(password, gallery.password_hash))) return { error: "Contraseña incorrecta", status: 401 };
  return { gallery };
}

export function jsonError(message, status = 400) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}
