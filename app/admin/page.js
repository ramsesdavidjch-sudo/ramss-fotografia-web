"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const emptyForm = { id: null, name: "", description: "", price_from: "", price: "", category: "", features: "" };
const emptyPhoto = { id: null, title: "", category: "Retratos", alt_text: "", image_url: "", sort_order: 0, is_visible: true };
const emptyProject = { id: null, title: "", slug: "", description: "", category: "Editorial", cover_image_url: "", sort_order: 0, is_visible: true };\nconst defaultSettings = { brand_name: "RamsS Fotografía", tagline: "", hero_title: "", hero_description: "", intro_title: "", intro_description: "", about_title: "", about_description: "", contact_title: "", contact_description: "", contact_email: "", contact_phone: "", whatsapp_number: "", instagram_url: "https://www.instagram.com/ramssfotografia/", location_text: "", business_hours: "", seo_title: "", seo_description: "", hero_image_url: "", about_image_url: "", footer_text: "" };

export default function Admin() {
  const [session, setSession] = useState(null);
  const [tab, setTab] = useState("portfolio");
  const [subtab, setSubtab] = useState("photos");
  const [rows, setRows] = useState([]);
  const [projectImages, setProjectImages] = useState([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [photo, setPhoto] = useState(emptyPhoto);
  const [project, setProject] = useState(emptyProject);
  const [photoFile, setPhotoFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [projectFiles, setProjectFiles] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");\n  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, value) => setSession(value));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => { if (session) loadRows(); }, [session, tab, subtab, selectedProject]);

  async function loadRows() {
    if (!supabase) return;
    setMessage("");
    let result;
    if (tab === "settings") {\n      result = await supabase.from("site_settings").select("*").eq("id", 1).single();\n      if (result.data) setSettings({ ...defaultSettings, ...result.data });\n    } else if (tab === "portfolio" && subtab === "photos") {
      result = await supabase.from("portfolio_images").select("*").order("sort_order").order("created_at", { ascending: false });
    } else if (tab === "portfolio" && subtab === "projects") {
      result = await supabase.from("portfolio_projects").select("*").order("sort_order").order("created_at", { ascending: false });
    } else if (tab === "portfolio" && subtab === "project-images") {
      result = await supabase.from("portfolio_project_images").select("*").eq("project_id", selectedProject).order("sort_order");
    } else {
      const table = tab === "services" ? "services" : tab === "packages" ? "packages" : "inquiries";
      result = await supabase.from(table).select("*").order("created_at", { ascending: false }).limit(100);
    }
    if (result?.error) setMessage(result.error.message);
    else setRows(result?.data || []);
    if (tab === "portfolio" && subtab === "project-images" && selectedProject) {
      const images = await supabase.from("portfolio_project_images").select("*").eq("project_id", selectedProject).order("sort_order");
      setProjectImages(images.data || []);
    }
  }

  async function uploadFile(file, folder) {
    if (!file) return null;
    if (!file.type.startsWith("image/")) throw new Error("Selecciona un archivo de imagen.");
    if (file.size > 12 * 1024 * 1024) throw new Error("Cada imagen debe pesar menos de 12 MB.");
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = folder + "/" + crypto.randomUUID() + "." + extension;
    const { error } = await supabase.storage.from("ramss-portfolio").upload(path, file, { upsert: false, contentType: file.type });
    if (error) throw error;
    return supabase.storage.from("ramss-portfolio").getPublicUrl(path).data.publicUrl;
  }

  async function savePhoto(e) {
    e.preventDefault(); setBusy(true); setMessage("");
    try {
      const image_url = photoFile ? await uploadFile(photoFile, "individuales") : photo.image_url;
      if (!image_url) throw new Error("Debes seleccionar una fotografía.");
      const payload = { title: photo.title, category: photo.category, alt_text: photo.alt_text, image_url, sort_order: Number(photo.sort_order) || 0, is_visible: photo.is_visible };
      const result = photo.id ? await supabase.from("portfolio_images").update(payload).eq("id", photo.id) : await supabase.from("portfolio_images").insert(payload);
      if (result.error) throw result.error;
      setPhoto(emptyPhoto); setPhotoFile(null); setMessage("Fotografía guardada."); await loadRows();
    } catch (error) { setMessage(error.message || "No se pudo guardar."); }
    finally { setBusy(false); }
  }

  async function saveProject(e) {
    e.preventDefault(); setBusy(true); setMessage("");
    try {
      const cover_image_url = coverFile ? await uploadFile(coverFile, "proyectos-portada") : project.cover_image_url;
      if (!cover_image_url) throw new Error("Selecciona una imagen de portada.");
      const slug = (project.slug || project.title).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const payload = { title: project.title, slug, description: project.description, category: project.category, cover_image_url, sort_order: Number(project.sort_order) || 0, is_visible: project.is_visible };
      const result = project.id ? await supabase.from("portfolio_projects").update(payload).eq("id", project.id).select().single() : await supabase.from("portfolio_projects").insert(payload).select().single();
      if (result.error) throw result.error;
      setProject(result.data); setCoverFile(null); setSelectedProject(result.data.id); setSubtab("project-images"); setMessage("Proyecto guardado. Ahora puedes añadir sus fotografías.");
      await loadRows();
    } catch (error) { setMessage(error.message || "No se pudo guardar."); }
    finally { setBusy(false); }
  }

  async function addProjectImages(e) {
    e.preventDefault(); if (!selectedProject || !projectFiles.length) return;
    setBusy(true);
    try {
      const current = projectImages.length;
      const payload = [];
      for (let i = 0; i < projectFiles.length; i++) {
        const image_url = await uploadFile(projectFiles[i], "proyectos");
        payload.push({ project_id: selectedProject, image_url, alt_text: project.title || "Fotografía editorial", sort_order: current + i });
      }
      const { error } = await supabase.from("portfolio_project_images").insert(payload);
      if (error) throw error;
      setProjectFiles([]); setMessage("Imágenes añadidas al proyecto."); await loadRows();
    } catch (error) { setMessage(error.message || "No se pudieron subir las imágenes."); }
    finally { setBusy(false); }
  }

  async function moveProjectImage(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= projectImages.length) return;
    const current = projectImages[index];
    const other = projectImages[target];
    const first = await supabase.from("portfolio_project_images").update({ sort_order: other.sort_order }).eq("id", current.id);
    const second = await supabase.from("portfolio_project_images").update({ sort_order: current.sort_order }).eq("id", other.id);
    if (first.error || second.error) setMessage(first.error?.message || second.error?.message);
    else await loadRows();
  }

  async function saveSettings(e) {\n    e.preventDefault(); setBusy(true); setMessage("");\n    try {\n      const payload = { ...settings, id: 1, updated_at: new Date().toISOString() };\n      const { error } = await supabase.from("site_settings").upsert(payload, { onConflict: "id" });\n      if (error) throw error;\n      setMessage("Información del sitio y contacto guardada.");\n    } catch (error) { setMessage(error.message || "No se pudo guardar la configuración."); }\n    finally { setBusy(false); }\n  }\n\n  async function saveItem(e) {
    e.preventDefault(); setBusy(true);
    try {
      const payload = tab === "services"
        ? { name: form.name, description: form.description, price_from: form.price_from, is_active: true }
        : { name: form.name, description: form.description, price: form.price === "" ? null : Number(form.price), category: form.category || "Paquete", features: form.features.split("\n").map(x => x.trim()).filter(Boolean), is_active: true };
      const result = form.id ? await supabase.from(tab).update(payload).eq("id", form.id) : await supabase.from(tab).insert(payload);
      if (result.error) throw result.error;
      setForm(emptyForm); setMessage("Guardado correctamente."); await loadRows();
    } catch (error) { setMessage(error.message || "No se pudo guardar."); }
    finally { setBusy(false); }
  }

  async function remove(table, id, url) {
    if (!confirm("¿Seguro que deseas eliminar este elemento?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) { setMessage(error.message); return; }
    if (url) {
      try {
        const parsed = new URL(url);
        const marker = "/storage/v1/object/public/ramss-portfolio/";
        const index = parsed.pathname.indexOf(marker);
        if (index >= 0) await supabase.storage.from("ramss-portfolio").remove([decodeURIComponent(parsed.pathname.slice(index + marker.length))]);
      } catch {}
    }
    setMessage("Elemento eliminado."); await loadRows();
  }

  async function login(e) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage(error.message);
  }

  if (!supabase) return <div className="admin-shell"><div className="admin-box"><h1>RAMSS <i>ADMIN</i></h1><p>Configura las variables de Supabase en .env.local para activar el panel.</p></div></div>;
  if (!session) return <div className="admin-shell"><form className="admin-box" onSubmit={login}><p className="eyebrow">ÁREA PRIVADA</p><h1>RAMSS <i>ADMIN</i></h1><p>Inicia sesión para administrar tu sitio.</p><label>Correo<input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></label><label>Contraseña<input type="password" required value={password} onChange={e => setPassword(e.target.value)} /></label><button className="button button-light">Entrar</button>{message && <p>{message}</p>}<a href="/">← Volver al sitio</a></form></div>;

  return <div className="admin-layout">
    <aside className="admin-side"><a className="wordmark" href="/">RAMSS<span>®</span><small>ADMINISTRACIÓN</small></a>
      {["portfolio", "services", "packages", "inquiries", "settings"].map(key => <button className={tab === key ? "active" : ""} key={key} onClick={() => { setTab(key); setForm(emptyForm); }}>{({ portfolio: "Portafolio", services: "Servicios", packages: "Paquetes", inquiries: "Solicitudes", settings: "Sitio y contacto" })[key]}</button>)}
      <button onClick={() => supabase.auth.signOut()}>Cerrar sesión</button><a href="/">Ver sitio ↗</a>
    </aside>
    <section className="admin-main"><p className="eyebrow">PANEL DE CONTROL</p><h1>{({ portfolio: "Portafolio", services: "Servicios", packages: "Paquetes", inquiries: "Solicitudes", settings: "Sitio y contacto" })[tab]}</h1>
      {message && <p className="admin-message">{message}</p>}
      {tab === "portfolio" && <div className="admin-tabs">
        <button className={subtab === "photos" ? "selected" : ""} onClick={() => setSubtab("photos")}>Fotografías individuales</button>
        <button className={subtab === "projects" ? "selected" : ""} onClick={() => setSubtab("projects")}>Proyectos editoriales</button>
        {subtab === "project-images" && <button className="selected">Imágenes del proyecto</button>}
      </div>}
      {tab === "portfolio" && subtab === "photos" && <>
        <form className="admin-create" onSubmit={savePhoto}><h2>{photo.id ? "Editar fotografía" : "Añadir fotografía"}</h2><label>Imagen<input type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files?.[0] || null)} /></label>{photo.image_url && <img className="admin-preview" src={photo.image_url} alt="Vista previa" />}<label>Título<input value={photo.title} onChange={e => setPhoto({ ...photo, title: e.target.value })} /></label><label>Categoría<input value={photo.category} onChange={e => setPhoto({ ...photo, category: e.target.value })} /></label><label>Texto alternativo<input value={photo.alt_text} onChange={e => setPhoto({ ...photo, alt_text: e.target.value })} /></label><label>Orden<input type="number" value={photo.sort_order} onChange={e => setPhoto({ ...photo, sort_order: e.target.value })} /></label><label className="admin-check"><input type="checkbox" checked={photo.is_visible} onChange={e => setPhoto({ ...photo, is_visible: e.target.checked })} /> Visible en la web</label><div className="admin-actions"><button className="button button-dark" disabled={busy}>{busy ? "Guardando..." : "Guardar fotografía"}</button><button type="button" className="button button-quiet" onClick={() => { setPhoto(emptyPhoto); setPhotoFile(null); }}>Limpiar</button></div></form>
        <div className="admin-list">{rows.map(r => <article key={r.id}><img className="admin-thumb" src={r.image_url} alt="" /><div className="admin-row-copy"><strong>{r.title || "Sin título"}</strong><p>{r.category} · Orden {r.sort_order} · {r.is_visible ? "Visible" : "Oculta"}</p></div><div className="admin-actions"><button onClick={() => { setPhoto(r); setPhotoFile(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Editar</button><button onClick={() => remove("portfolio_images", r.id, r.image_url)}>Eliminar</button></div></article>)}{!rows.length && <p>Aún no has añadido fotografías.</p>}</div>
      </>}
      {tab === "portfolio" && subtab === "projects" && <>
        <form className="admin-create" onSubmit={saveProject}><h2>{project.id ? "Editar proyecto" : "Crear proyecto editorial"}</h2><label>Portada<input type="file" accept="image/*" onChange={e => setCoverFile(e.target.files?.[0] || null)} /></label>{project.cover_image_url && <img className="admin-preview" src={project.cover_image_url} alt="Portada actual" />}<label>Título<input required value={project.title} onChange={e => setProject({ ...project, title: e.target.value })} /></label><label>Slug (opcional)<input value={project.slug} onChange={e => setProject({ ...project, slug: e.target.value })} placeholder="editorial-en-la-costa" /></label><label>Descripción<textarea rows="3" value={project.description} onChange={e => setProject({ ...project, description: e.target.value })} /></label><label>Categoría<input value={project.category} onChange={e => setProject({ ...project, category: e.target.value })} /></label><label>Orden<input type="number" value={project.sort_order} onChange={e => setProject({ ...project, sort_order: e.target.value })} /></label><label className="admin-check"><input type="checkbox" checked={project.is_visible} onChange={e => setProject({ ...project, is_visible: e.target.checked })} /> Visible en la web</label><div className="admin-actions"><button className="button button-dark" disabled={busy}>{busy ? "Guardando..." : "Guardar proyecto"}</button><button type="button" className="button button-quiet" onClick={() => { setProject(emptyProject); setCoverFile(null); }}>Nuevo</button></div></form>
        <div className="admin-list">{rows.map(r => <article key={r.id}><img className="admin-thumb" src={r.cover_image_url} alt="" /><div className="admin-row-copy"><strong>{r.title}</strong><p>{r.category} · {r.is_visible ? "Visible" : "Oculto"}</p></div><div className="admin-actions"><button onClick={() => { setProject(r); setCoverFile(null); }}>Editar</button><button onClick={() => { setSelectedProject(r.id); setProject(r); setSubtab("project-images"); }}>Gestionar imágenes</button><button onClick={() => remove("portfolio_projects", r.id)}>Eliminar</button></div></article>)}{!rows.length && <p>Aún no hay proyectos editoriales.</p>}</div>
      </>}
      {tab === "portfolio" && subtab === "project-images" && <>
        <button className="button button-quiet" onClick={() => setSubtab("projects")}>← Volver a proyectos</button><h2>{project.title || "Imágenes del proyecto"}</h2><form className="admin-create" onSubmit={addProjectImages}><label>Añadir imágenes (puedes seleccionar varias)<input type="file" accept="image/*" multiple onChange={e => setProjectFiles(Array.from(e.target.files || []))} /></label><p>{projectFiles.length} archivo(s) seleccionado(s)</p><button className="button button-dark" disabled={busy || !projectFiles.length}>{busy ? "Subiendo..." : "Subir imágenes"}</button></form>
        <div className="admin-list">{projectImages.map((r, i) => <article key={r.id}><img className="admin-thumb" src={r.image_url} alt="" /><div className="admin-row-copy"><strong>Imagen {i + 1}</strong><p>Orden {r.sort_order}</p></div><div className="admin-actions"><button disabled={i === 0} onClick={() => moveProjectImage(i, -1)}>Subir</button><button disabled={i === projectImages.length - 1} onClick={() => moveProjectImage(i, 1)}>Bajar</button><button onClick={() => remove("portfolio_project_images", r.id, r.image_url)}>Eliminar</button></div></article>)}{!projectImages.length && <p>Este proyecto aún no tiene imágenes.</p>}</div>
      </>}
      {(tab === "services" || tab === "packages") && <>
        <form className="admin-create" onSubmit={saveItem}><h2>{form.id ? "Editar" : "Agregar"} {tab === "services" ? "servicio" : "paquete"}</h2><label>Nombre<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label><label>Descripción<textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>{tab === "services" ? <label>Precio desde<input value={form.price_from} onChange={e => setForm({ ...form, price_from: e.target.value })} /></label> : <><label>Precio USD<input type="number" min="0" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></label><label>Categoría<input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></label><label>Características (una por línea)<textarea rows="4" value={form.features} onChange={e => setForm({ ...form, features: e.target.value })} /></label></>}<div className="admin-actions"><button className="button button-dark" disabled={busy}>Guardar</button><button type="button" className="button button-quiet" onClick={() => setForm(emptyForm)}>Limpiar</button></div></form>
        <div className="admin-list">{rows.map(r => <article key={r.id}><div className="admin-row-copy"><strong>{r.name}</strong><p>{r.description}</p></div><div className="admin-actions"><button onClick={() => setForm({ id: r.id, name: r.name, description: r.description || "", price_from: r.price_from || "", price: r.price ?? "", category: r.category || "", features: (r.features || []).join("\n") })}>Editar</button><button onClick={() => remove(tab, r.id)}>Eliminar</button></div></article>)}{!rows.length && <p>No hay registros.</p>}</div>
      </>}
      {tab === "settings" && <form className="admin-create settings-form" onSubmit={saveSettings}>
        <h2>Identidad y página de inicio</h2>
        <label>Nombre de marca<input value={settings.brand_name} onChange={e=>setSettings({...settings,brand_name:e.target.value})}/></label>
        <label>Frase de marca / especialidades<input value={settings.tagline} onChange={e=>setSettings({...settings,tagline:e.target.value})}/></label>
        <label>Imagen principal (URL de Supabase Storage)<input value={settings.hero_image_url} onChange={e=>setSettings({...settings,hero_image_url:e.target.value})} placeholder="https://..."/></label>\n        <label>Título principal<textarea rows="2" value={settings.hero_title} onChange={e=>setSettings({...settings,hero_title:e.target.value})}/></label>
        <label>Texto principal<textarea rows="3" value={settings.hero_description} onChange={e=>setSettings({...settings,hero_description:e.target.value})}/></label>
        <label>Título de introducción<input value={settings.intro_title} onChange={e=>setSettings({...settings,intro_title:e.target.value})}/></label>
        <label>Texto de introducción<textarea rows="3" value={settings.intro_description} onChange={e=>setSettings({...settings,intro_description:e.target.value})}/></label>
        <h2>Acerca de mí</h2>\n        <label>Imagen de presentación (URL)<input value={settings.about_image_url} onChange={e=>setSettings({...settings,about_image_url:e.target.value})} placeholder="https://..."/></label>
        <label>Título de presentación<input value={settings.about_title} onChange={e=>setSettings({...settings,about_title:e.target.value})}/></label>
        <label>Biografía<textarea rows="5" value={settings.about_description} onChange={e=>setSettings({...settings,about_description:e.target.value})}/></label>
        <h2>Información de contacto</h2>
        <label>Título de contacto<input value={settings.contact_title} onChange={e=>setSettings({...settings,contact_title:e.target.value})}/></label>
        <label>Texto de contacto<textarea rows="3" value={settings.contact_description} onChange={e=>setSettings({...settings,contact_description:e.target.value})}/></label>
        <label>Correo público<input type="email" value={settings.contact_email} onChange={e=>setSettings({...settings,contact_email:e.target.value})}/></label>
        <label>Teléfono público<input value={settings.contact_phone} onChange={e=>setSettings({...settings,contact_phone:e.target.value})}/></label>
        <label>Número de WhatsApp con código de país<input value={settings.whatsapp_number} onChange={e=>setSettings({...settings,whatsapp_number:e.target.value})} placeholder="58412XXXXXXX"/></label>
        <label>Enlace de Instagram<input type="url" value={settings.instagram_url} onChange={e=>setSettings({...settings,instagram_url:e.target.value})}/></label>
        <label>Ubicación / zona de servicio<input value={settings.location_text} onChange={e=>setSettings({...settings,location_text:e.target.value})}/></label>
        <label>Horario de atención<input value={settings.business_hours} onChange={e=>setSettings({...settings,business_hours:e.target.value})}/></label>
        <h2>Pie de página</h2>\n        <label>Texto del pie de página<input value={settings.footer_text} onChange={e=>setSettings({...settings,footer_text:e.target.value})}/></label>\n        <h2>SEO y buscadores</h2>
        <label>Título SEO<input value={settings.seo_title} onChange={e=>setSettings({...settings,seo_title:e.target.value})}/></label>
        <label>Descripción SEO<textarea rows="3" value={settings.seo_description} onChange={e=>setSettings({...settings,seo_description:e.target.value})}/></label>
        <button className="button button-dark" disabled={busy}>{busy ? "Guardando..." : "Guardar toda la configuración"}</button>
      </form>}
      {tab === "inquiries" && <div className="admin-list">{rows.map(r => <article key={r.id}><div className="admin-row-copy"><strong>{r.name}</strong><p>{r.email} · {r.service || "Sin servicio especificado"}</p><p>{r.details}</p><small>{new Date(r.created_at).toLocaleString("es-VE")}</small></div><button onClick={() => remove("inquiries", r.id)}>Eliminar</button></article>)}{!rows.length && <p>No hay solicitudes todavía.</p>}</div>}
    </section>
  </div>;
}
