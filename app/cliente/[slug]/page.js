"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

export default function ClientGalleryPage() {
  const params = useParams();
  const slug = params.slug;
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState(null);
  const [comment, setComment] = useState("");
  const [timestamp, setTimestamp] = useState("0:00");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("token") || "";
    setToken(value);
    setLoading(false);
  }, []);

  const headers = useMemo(() => ({ "x-gallery-password": password }), [password]);

  async function loadGallery(pass = password) {
    if (!token || !slug) return;
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/client/" + encodeURIComponent(slug) + "?token=" + encodeURIComponent(token), {
        headers: { "x-gallery-password": pass }, cache: "no-store"
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo abrir la galería.");
      setData(result);
      setActiveVideo(result.videos?.find(v => v.is_current) || result.videos?.[0] || null);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (token && slug) loadGallery(""); }, [token, slug]);

  function parseTime(value) {
    const parts = String(value).split(":").map(Number);
    if (parts.some(n => !Number.isFinite(n) || n < 0)) return 0;
    const seconds = parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0];
    return Math.floor(seconds * 1000);
  }

  async function approveVideo() {
    if (!activeVideo || !window.confirm("¿Confirmas que esta versión del vídeo está aprobada?")) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/client/" + encodeURIComponent(slug) + "/approval?token=" + encodeURIComponent(token), {
        method: "POST", headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ version_id: activeVideo.id })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo registrar la aprobación.");
      await loadGallery();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function sendComment(e) {
    e.preventDefault();
    if (!activeVideo || !comment.trim()) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/client/" + encodeURIComponent(slug) + "/comments?token=" + encodeURIComponent(token), {
        method: "POST", headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ version_id: activeVideo.id, timestamp_ms: parseTime(timestamp), body: comment })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo enviar el comentario.");
      setComment("");
      await loadGallery();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  if (loading) return <main className="client-gallery-shell"><p>Preparando tu galería…</p></main>;
  if (!token) return <main className="client-gallery-shell"><h1>Enlace incompleto</h1><p>Solicita al fotógrafo un enlace de acceso válido.</p></main>;
  if (error && !data && error.toLowerCase().includes("contraseña")) return (
    <main className="client-gallery-shell"><section className="client-password"><p className="eyebrow">RAMSS FOTOGRAFÍA · ÁREA PRIVADA</p><h1>Esta galería es privada.</h1><p>Introduce la contraseña que recibiste para continuar.</p><form onSubmit={e=>{e.preventDefault();setPassword(passwordInput);loadGallery(passwordInput);}}><input type="password" value={passwordInput} onChange={e=>setPasswordInput(e.target.value)} placeholder="Contraseña de acceso" required/><button className="button button-dark">Entrar</button></form>{error && <p className="client-error">{error}</p>}</section></main>
  );
  if (error && !data) return <main className="client-gallery-shell"><section className="client-password"><p className="eyebrow">RAMSS FOTOGRAFÍA</p><h1>No se pudo abrir la galería.</h1><p>{error}</p></section></main>;
  if (!data) return null;

  const comments = data.comments || [];
  const videoComments = activeVideo ? comments.filter(c => c.version_id === activeVideo.id) : [];

  return <main className="client-gallery-shell">
    <header className="client-gallery-header"><a href="/" className="wordmark">RAMSS<span>®</span><small>FOTOGRAFÍA</small></a><span>ENTREGA PRIVADA</span></header>
    <section className="client-gallery-intro"><p className="eyebrow">GALERÍA PRIVADA</p><h1>{data.gallery.title}</h1><p>{data.gallery.description}</p><div className="client-status">{data.gallery.delivery_released ? "Descargas originales disponibles" : "Previsualizaciones protegidas · Entrega pendiente"}</div></section>
    {data.assets.length > 0 && <section className="client-photo-grid">{data.assets.map(asset=><article key={asset.id}><img src={asset.preview_url} alt={asset.title || "Fotografía de la galería"}/><div><span>{asset.title || "Fotografía"}</span>{data.gallery.delivery_released && <a href={"/api/client/"+encodeURIComponent(slug)+"/download/"+asset.id+"?token="+encodeURIComponent(token)} className="client-download">Descargar original ↗</a>}</div></article>)}</section>}
    {data.videos.length > 0 && <section className="client-video-review"><div className="client-video-heading"><p className="eyebrow">REVISIÓN AUDIOVISUAL</p><h2>Revisa el proyecto.</h2><p>Selecciona una versión, deja tus observaciones y señala el minuto correspondiente.</p></div>
      <div className="client-video-layout"><div className="client-video-player">{activeVideo?.preview_url && <video key={activeVideo.id} src={activeVideo.preview_url} controls controlsList="nodownload" onContextMenu={e=>e.preventDefault()}/>}<div className="client-version-list">{data.videos.map(v=><button key={v.id} className={activeVideo?.id===v.id?"selected":""} onClick={()=>setActiveVideo(v)}>Versión {v.version_number}{v.is_current?" · Actual":""}</button>)}</div>{activeVideo && <div className="client-approval">{activeVideo.client_approved_at ? <span>Versión aprobada</span> : <button className="button button-dark" onClick={approveVideo} disabled={busy}>Aprobar esta versión</button>}<small>La aprobación del vídeo no libera los archivos originales.</small></div>}</div>
      <div className="client-review-panel"><h3>Comentarios</h3>{videoComments.map(c=><article key={c.id} className="client-comment"><span>{Math.floor(c.timestamp_ms/60000)}:{String(Math.floor(c.timestamp_ms/1000)%60).padStart(2,"0")} · {c.status==="resolved"?"Resuelto":c.status==="in_progress"?"En revisión":"Pendiente"}</span><p>{c.body}</p>{c.admin_reply && <blockquote>Respuesta: {c.admin_reply}</blockquote>}</article>)}{videoComments.length===0 && <p className="client-muted">Todavía no hay comentarios para esta versión.</p>}
      <form onSubmit={sendComment}><label>Minuto del vídeo (mm:ss)<input value={timestamp} onChange={e=>setTimestamp(e.target.value)} placeholder="0:30"/></label><label>Tu observación<textarea rows="4" value={comment} onChange={e=>setComment(e.target.value)} maxLength={1500} required placeholder="Describe el ajuste que necesitas…"/></label><button className="button button-dark" disabled={busy}>{busy?"Enviando…":"Enviar comentario"}</button></form>
      </div></div>
    </section>}
    <footer className="client-gallery-footer">RamsS Fotografía · Tu material original permanece protegido hasta la confirmación de pago.</footer>
  </main>;
}
