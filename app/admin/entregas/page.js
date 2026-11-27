"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

const blank = { full_name: "", email: "", phone: "", title: "", description: "", password: "", expires_at: "" };

export default function PrivateDeliveriesAdmin() {
  const [session, setSession] = useState(null);
  const [form, setForm] = useState(blank);
  const [galleries, setGalleries] = useState([]);
  const [selected, setSelected] = useState("");
  const [assets, setAssets] = useState([]);
  const [videos, setVideos] = useState([]);
  const [comments, setComments] = useState([]);
  const [photoOriginal, setPhotoOriginal] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [videoOriginal, setVideoOriginal] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [kind, setKind] = useState("photo");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState("");

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, value) => setSession(value));
    return () => listener.subscription.unsubscribe();
  }, []);

  async function api(path, options = {}) {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) throw new Error("Tu sesión ha caducado. Inicia sesión de nuevo.");
    const response = await fetch(path, {
      ...options,
      headers: { Authorization: "Bearer " + accessToken, ...(options.headers || {}) },
      cache: "no-store"
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "No se pudo completar la operación.");
    return result;
  }

  async function load() {
    try {
      const result = await api("/api/admin/deliveries");
      setGalleries(result.galleries || []);
      if (selected) await loadSelected(selected);
    } catch (e) { setMessage(e.message); }
  }

  async function loadSelected(id) {
    setSelected(id);
    const [a, v] = await Promise.all([
      supabase.from("gallery_assets").select("*").eq("gallery_id", id).order("sort_order"),
      supabase.from("gallery_video_versions").select("*").eq("gallery_id", id).order("version_number", { ascending: false })
    ]);
    setAssets(a.data || []); setVideos(v.data || []);
    if (v.data?.length) {
      const ids = v.data.map(item => item.id);
      const c = await supabase.from("video_review_comments").select("*").in("version_id", ids).order("created_at", { ascending: false });
      setComments(c.data || []);
    } else setComments([]);
  }

  useEffect(() => { if (session) load(); }, [session]);

  async function createGallery(e) {
    e.preventDefault(); setBusy(true); setMessage(""); setLink("");
    try {
      const result = await api("/api/admin/deliveries", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form)
      });
      setLink(result.client_url); setForm(blank); setMessage("Galería creada. Copia y comparte el enlace privado.");
      await load();
    } catch (e) { setMessage(e.message); }
    finally { setBusy(false); }
  }

  async function updateGallery(id, action) {
    const labels = {
      mark_paid: "¿Confirmaste el pago recibido?",
      release_delivery: "¿Liberar los originales para este cliente?",
      revoke_delivery: "¿Revocar el acceso a los originales?",
      mark_refunded: "¿Registrar el reembolso y bloquear las descargas?",
      suspend: "¿Suspender el enlace de esta galería?",
      restore: "¿Reactivar el enlace de esta galería?"
    };
    if (labels[action] && !window.confirm(labels[action])) return;
    try {
      await api("/api/admin/deliveries/" + id, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action })
      });
      setMessage("Estado de la entrega actualizado."); await load();
    } catch (e) { setMessage(e.message); }
  }

  async function upload(e) {
    e.preventDefault();
    const original = kind === "photo" ? photoOriginal : videoOriginal;
    const preview = kind === "photo" ? photoPreview : videoPreview;
    if (!selected || !original || !preview) { setMessage("Selecciona el original y su previsualización con marca de agua."); return; }
    setBusy(true); setMessage("");
    try {
      const prepared = await api("/api/admin/deliveries/" + selected + "/uploads", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind, original_mime: original.type, preview_mime: preview.type,
          original_name: original.name, preview_name: preview.name
        })
      });
      const bucket = supabase.storage.from("ramss-deliveries");
      const [previewUpload, originalUpload] = await Promise.all([
        bucket.uploadToSignedUrl(prepared.preview.path, prepared.preview.token, preview, { contentType: preview.type }),
        bucket.uploadToSignedUrl(prepared.original.path, prepared.original.token, original, { contentType: original.type })
      ]);
      if (previewUpload.error || originalUpload.error) throw new Error(previewUpload.error?.message || originalUpload.error?.message || "Falló la carga al almacenamiento.");
      await api("/api/admin/deliveries/" + selected + "/assets", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind, title, watermarked: true,
          preview_path: prepared.preview.path, original_path: prepared.original.path,
          original_mime: original.type, original_size: original.size
        })
      });
      setTitle(""); setPhotoOriginal(null); setPhotoPreview(null); setVideoOriginal(null); setVideoPreview(null);
      setMessage("Archivo añadido correctamente."); await loadSelected(selected);
    } catch (e) { setMessage(e.message); }
    finally { setBusy(false); }
  }

  async function reply(comment) {
    const answer = window.prompt("Respuesta para el cliente:", comment.admin_reply || "");
    if (answer === null) return;
    try {
      const version = videos.find(v => v.id === comment.version_id);
      await api("/api/admin/deliveries/" + selected + "/comments/" + comment.id, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version_id: version?.id, admin_reply: answer, status: comment.status })
      });
      setMessage("Respuesta guardada."); await loadSelected(selected);
    } catch (e) { setMessage(e.message); }
  }

  if (!supabase) return <main className="delivery-admin"><p>Configura Supabase para acceder a las entregas.</p></main>;
  if (!session) return <main className="delivery-admin"><section className="delivery-admin-card"><h1>Acceso administrativo</h1><p>Inicia sesión primero en el panel principal.</p><a href="/admin">Ir a administración ↗</a></section></main>;

  return <main className="delivery-admin">
    <header className="delivery-admin-header"><a href="/admin">← Volver al panel</a><span>RAMSS FOTOGRAFÍA · ENTREGAS PRIVADAS</span></header>
    <div className="delivery-admin-main"><p className="eyebrow">GESTIÓN DE CLIENTES</p><h1>Entregas privadas.</h1><p className="delivery-admin-lead">Crea galerías, gestiona pagos y libera archivos originales solo cuando corresponda.</p>
      {message && <p className="delivery-admin-message">{message}</p>}
      {link && <div className="delivery-link-box"><strong>Enlace privado generado</strong><input readOnly value={link}/><button onClick={()=>navigator.clipboard.writeText(link)}>Copiar enlace</button><small>Guarda este enlace: el token de acceso no se vuelve a mostrar en el panel.</small></div>}
      <section className="delivery-admin-card"><h2>Nueva galería</h2><form className="delivery-create-form" onSubmit={createGallery}>
        <label>Nombre del cliente<input required value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/></label>
        <label>Correo electrónico<input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
        <label>Teléfono<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label>
        <label>Nombre de la entrega<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
        <label>Descripción<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
        <label>Contraseña opcional (mínimo 10 caracteres)<input type="password" minLength={10} value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label>
        <label>Fecha de expiración (opcional)<input type="datetime-local" value={form.expires_at} onChange={e=>setForm({...form,expires_at:e.target.value ? new Date(e.target.value).toISOString() : ""})}/></label>
        <button className="button button-dark" disabled={busy}>{busy?"Creando…":"Crear galería privada"}</button>
      </form></section>
      <section className="delivery-list-section"><h2>Galerías existentes</h2>{galleries.length===0 && <p>No hay galerías creadas todavía.</p>}
        <div className="delivery-gallery-list">{galleries.map(g=><article key={g.id} className={selected===g.id?"active":""}><button className="delivery-gallery-select" onClick={()=>loadSelected(g.id)}><strong>{g.title}</strong><span>{g.clients?.full_name} · {g.clients?.email}</span><small>Pago: {g.payment_status==="paid"?"Confirmado":g.payment_status==="refunded"?"Reembolsado":"Pendiente"} · {g.delivery_released_at?"Originales liberados":"Originales protegidos"} {g.suspended_at?"· Suspendida":""}</small></button><div className="delivery-gallery-actions"><button onClick={()=>updateGallery(g.id,"mark_paid")}>Confirmar pago</button><button onClick={()=>updateGallery(g.id,"release_delivery")} disabled={g.payment_status!=="paid"}>Liberar originales</button><button onClick={()=>updateGallery(g.id,g.suspended_at?"restore":"suspend")}>{g.suspended_at?"Reactivar enlace":"Suspender enlace"}</button><button onClick={()=>updateGallery(g.id,"revoke_delivery")}>Revocar descargas</button></div></article>)}</div>
      </section>
      {selected && <section className="delivery-admin-card"><h2>Contenido de la galería</h2><form className="delivery-upload-form" onSubmit={upload}>
        <label>Tipo de contenido<select value={kind} onChange={e=>setKind(e.target.value)}><option value="photo">Fotografía</option><option value="video">Vídeo de revisión</option></select></label>
        <label>Título<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Nombre del archivo"/></label>
        <label>Original (se mantiene privado)<input type="file" required accept={kind==="photo"?"image/jpeg,image/png,image/webp":"video/mp4,video/webm,video/quicktime"} onChange={e=>kind==="photo"?setPhotoOriginal(e.target.files?.[0]):setVideoOriginal(e.target.files?.[0])}/></label>
        <label>Previsualización con marca de agua incrustada<input type="file" required accept={kind==="photo"?"image/jpeg,image/png,image/webp":"video/mp4,video/webm,video/quicktime"} onChange={e=>kind==="photo"?setPhotoPreview(e.target.files?.[0]):setVideoPreview(e.target.files?.[0])}/></label>
        <p>La previsualización debe tener la marca de agua aplicada al archivo antes de subirlo. No basta con una capa visual superpuesta.</p>
        <button className="button button-dark" disabled={busy}>{busy?"Subiendo…":"Subir contenido"}</button>
      </form>
      <h3>Fotografías ({assets.length})</h3><div className="delivery-asset-list">{assets.map(a=><span key={a.id}>{a.title||"Fotografía"} · {(a.file_size_bytes/1048576).toFixed(1)} MB</span>)}</div>
      <h3>Versiones de vídeo ({videos.length})</h3><div className="delivery-asset-list">{videos.map(v=><span key={v.id}>Versión {v.version_number} {v.is_current?"· Actual":""} — {v.title}</span>)}</div>
      <h3>Comentarios del cliente ({comments.length})</h3><div className="delivery-comment-list">{comments.map(c=><article key={c.id}><strong>{Math.floor(c.timestamp_ms/60000)}:{String(Math.floor(c.timestamp_ms/1000)%60).padStart(2,"0")} · {c.body}</strong><p>{c.admin_reply?"Respuesta: "+c.admin_reply:"Sin respuesta"} · {c.status}</p><button onClick={()=>reply(c)}>Responder / actualizar</button></article>)}</div>
      </section>}
    </div>
  </main>;
}
