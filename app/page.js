"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

const fallbackServices = [
  { id: "s1", name: "Retratos", description: "Sesiones individuales y retratos con dirección creativa.", price_from: "Consultar", image_url: "" },
  { id: "s2", name: "Eventos", description: "Cobertura fotográfica de celebraciones y ocasiones especiales.", price_from: "Consultar", image_url: "" },
  { id: "s3", name: "Editorial & moda", description: "Historias visuales, conceptos y fotografía editorial.", price_from: "Consultar", image_url: "" },
  { id: "s4", name: "Fotografía comercial", description: "Contenido visual para marcas, productos y negocios.", price_from: "Consultar", image_url: "" }
];

export default function Home() {
  const [services, setServices] = useState(fallbackServices);
  const [packages, setPackages] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [editorialProjects, setEditorialProjects] = useState([]);
  const [site, setSite] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", service: "", details: "" });
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    (async () => {
      const [s, p, photos, projects, settings] = await Promise.all([
        supabase.from("services").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("packages").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("portfolio_images").select("*").eq("is_visible", true).order("sort_order"),
        supabase.from("portfolio_projects").select("*, portfolio_project_images(*)").eq("is_visible", true).order("sort_order"),
        supabase.from("site_settings").select("*").eq("id", 1).single()
      ]);
      if (s.data?.length) setServices(s.data);
      if (p.data) setPackages(p.data);
      if (photos.data) setGallery(photos.data);
      else if (photos.error?.code === "42P01") {
        const legacy = await supabase.from("gallery").select("*").eq("is_visible", true).order("sort_order");
        if (legacy.data) setGallery(legacy.data);
      }
      if (projects.data) setEditorialProjects(projects.data);
      if (settings.data) setSite(settings.data);
    })();
  }, []);

  async function submitInquiry(e) {
    e.preventDefault();
    if (!supabase) {
      alert("El formulario estará disponible cuando se conecte la base de datos.");
      return;
    }
    const { error } = await supabase.from("inquiries").insert([form]);
    if (error) alert("No se pudo enviar la solicitud. Inténtalo de nuevo o contáctame por Instagram.");
    else { setSent(true); setForm({ name: "", email: "", service: "", details: "" }); }
  }

  return (
    <main>
      {site?.announcement_enabled && site?.announcement_text && <div className="site-announcement">{site.announcement_text}</div>}\n      <nav className="nav wrap">
        <a className="wordmark" href="#">RAMSS<span>®</span><small>FOTOGRAFÍA</small></a>
        <div className="navlinks"><a href="#portfolio">Portafolio</a><a href="#services">Servicios</a><a href="#packages">Paquetes</a><a href="#contact">Contacto</a></div>
        <a className="nav-cta" href="#contact">Hablemos <span>↗</span></a>
      </nav>

      <section className="hero">
        <div className="hero-image" style={site?.hero_image_url ? { backgroundImage: `url("${site.hero_image_url}")` } : undefined} />
        <div className="hero-shade" />
        <div className="hero-content wrap">
          <p className="eyebrow">{site?.tagline || "FOTOGRAFÍA · DIRECCIÓN CREATIVA · CONTENIDO"}</p>
          <h1>{site?.hero_title || <>Imágenes que<br/><em>permanecen.</em></>}</h1>
          <p className="hero-copy">{site?.hero_description || "Una mirada visual cuidada para contar historias, preservar momentos y construir identidades."}</p>
          <div className="hero-actions"><a className="button button-light" href="#portfolio">Explorar portafolio <span>↗</span></a><a className="text-link" href="#contact">Solicitar una sesión</a></div>
        </div>
        <div className="hero-index">01 — 05 <span>RAMSS FOTOGRAFÍA</span></div>
      </section>

      <section className="intro wrap section-pad">
        <p className="eyebrow">EL ENFOQUE</p>
        <div><h2>{site?.intro_title || <>La fotografía como<br/><em>lenguaje propio.</em></>}</h2><p className="intro-text">{site?.intro_description || "Cada proyecto merece una intención, una estética y una historia. Trabajo desde una perspectiva visual que combina sensibilidad, composición y atención al detalle."}</p></div>
      </section>

      {site?.show_portfolio !== false && <section id="portfolio" className="portfolio section-pad">
        <div className="wrap section-heading"><div><p className="eyebrow">SELECCIÓN DE TRABAJOS</p><h2>Portafolio<span className="gold">.</span></h2></div><p>Una selección de historias<br/>contadas a través de imágenes.</p></div>
        {(gallery.length || editorialProjects.length) ? <div className="wrap portfolio-content">
          {editorialProjects.length > 0 && <><p className="eyebrow portfolio-kicker">PROYECTOS EDITORIALES</p><div className="editorial-grid">{editorialProjects.map((project) => <article className="editorial-card" key={project.id}><a href={`#proyecto-${project.slug}`}><img src={project.cover_image_url} alt={project.title}/><div><span>{project.category}</span><h3>{project.title}</h3><p>{project.description}</p></div></a></article>)}</div>
          {editorialProjects.map((project) => <section className="editorial-detail" id={`proyecto-${project.slug}`} key={project.id}><div className="editorial-detail-heading"><div><p className="eyebrow">{project.category}</p><h3>{project.title}</h3></div><p>{project.description}</p></div><div className="editorial-images">{(project.portfolio_project_images || []).sort((a,b)=>a.sort_order-b.sort_order).map((image)=><img key={image.id} src={image.image_url} alt={image.alt_text || project.title}/>)}</div></section>)}</>}
          {gallery.length > 0 && <><p className="eyebrow portfolio-kicker">FOTOGRAFÍAS INDIVIDUALES</p><div className="gallery-grid">{gallery.map((item) => <figure className="gallery-item" key={item.id}><img src={item.image_url} alt={item.alt_text || item.title || "Fotografía de portafolio"}/><figcaption>{item.title || item.category}</figcaption></figure>)}</div></>}
        </div> : <div className="portfolio-empty wrap"><div className="empty-frame"><span>R / S</span><small>TU PRÓXIMA HISTORIA VISUAL</small></div><p>El portafolio se actualizará con tus fotografías y proyectos editoriales desde el panel de administración.</p></div>}
      </section>}

      {site?.show_services !== false && <section id="services" className="wrap section-pad">
        <div className="section-heading"><div><p className="eyebrow">QUÉ PUEDO OFRECER</p><h2>Servicios<span className="gold">.</span></h2></div><p>Soluciones visuales pensadas<br/>para cada necesidad.</p></div>
        <div className="service-grid">{services.map((s, i) => <article className="service-card" key={s.id}><span className="service-no">0{i + 1}</span><h3>{s.name}</h3><p>{s.description}</p><div className="service-bottom"><span>Desde: {s.price_from || "Consultar"}</span><a href="#contact">Consultar ↗</a></div></article>)}</div>
      </section>}

      {site?.show_packages !== false && <section id="packages" className="packages section-pad">
        <div className="wrap">
          <div className="section-heading"><div><p className="eyebrow">PROPUESTAS</p><h2>Paquetes & experiencias<span className="gold">.</span></h2></div><p>Opciones claras, con la flexibilidad<br/>de crear algo a tu medida.</p></div>
          {packages.length ? <div className="package-grid">{packages.map((p) => <article className="package-card" key={p.id}><p className="eyebrow">{p.category || "PAQUETE"}</p><h3>{p.name}</h3><p>{p.description}</p><strong>{p.price ? `$${p.price} USD` : "Cotización personalizada"}</strong>{p.features?.length > 0 && <ul>{p.features.map((f, i) => <li key={i}>{f}</li>)}</ul>}<a className="button button-outline" href={`#contact`}>Consultar paquete ↗</a></article>)}</div> :
            <div className="custom-callout"><div><p className="eyebrow">HECHO A TU MEDIDA</p><h3>Tu idea merece<br/><em>una propuesta propia.</em></h3></div><p>Cuéntame qué tienes en mente y prepararé una propuesta según las características de tu proyecto.</p><a className="button button-light" href="#contact">Solicitar cotización ↗</a></div>}
        </div>
      </section>}

      {site?.show_about !== false && <section className="about wrap section-pad">{site?.about_image_url ? <img className="about-photo" src={site.about_image_url} alt="Retrato de Ramses"/> : <div className="about-mark">R<span>/</span>S</div>}<div><p className="eyebrow">DETRÁS DE LA CÁMARA</p><h2>{site?.about_title || <>Hola, soy<br/><em>Ramses.</em></>}</h2><p>{site?.about_description || "Fotógrafo enfocado en crear imágenes con identidad, intención y cuidado por los detalles. Este espacio reúne mi trabajo y las distintas formas en las que puedo ayudarte a contar tu historia."}</p><a className="text-link" href={site?.instagram_url || "https://www.instagram.com/ramssfotografia/"} target="_blank" rel="noreferrer">Conoce mi trabajo en Instagram ↗</a></div></section>}

      {site?.show_contact !== false && <section id="contact" className="contact section-pad"><div className="wrap contact-grid"><div><p className="eyebrow">EMPECEMOS ALGO</p><h2>{site?.contact_title || <>Hablemos de<br/><em>tu proyecto.</em></>}</h2><p className="contact-copy">{site?.contact_description || "Cuéntame qué necesitas. Te responderé para conversar sobre disponibilidad, ideas y presupuesto."}</p><div className="contact-links">
          {site?.contact_email && <a href={`mailto:${site.contact_email}`}>{site.contact_email} ↗</a>}
          {site?.contact_phone && <a href={`tel:${site.contact_phone}`}>{site.contact_phone}</a>}
          {site?.instagram_url && <a href={site.instagram_url} target="_blank" rel="noreferrer">Instagram ↗</a>}
          {site?.facebook_url && <a href={site.facebook_url} target="_blank" rel="noreferrer">Facebook ↗</a>}
          {site?.tiktok_url && <a href={site.tiktok_url} target="_blank" rel="noreferrer">TikTok ↗</a>}
          {site?.pinterest_url && <a href={site.pinterest_url} target="_blank" rel="noreferrer">Pinterest ↗</a>}
          {site?.whatsapp_number && <a href={`https://wa.me/${site.whatsapp_number.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">WhatsApp ↗</a>}
          {site?.google_maps_url && <a href={site.google_maps_url} target="_blank" rel="noreferrer">Ver ubicación ↗</a>}
          {site?.contact_address && <span>{site.contact_address}</span>}
          {site?.location_text && <span>{site.location_text}</span>}
          {site?.service_area && <span>Zona de servicio: {site.service_area}</span>}
          {site?.business_hours && <span>{site.business_hours}</span>}
        </div></div>
        {site?.contact_form_enabled !== false && <form className="contact-form" onSubmit={submitInquiry}><label>Nombre<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Tu nombre"/></label><label>Correo electrónico<input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="correo@ejemplo.com"/></label><label>Servicio de interés<select value={form.service} onChange={e=>setForm({...form,service:e.target.value})}><option value="">Selecciona un servicio</option>{services.map(s=><option key={s.id}>{s.name}</option>)}<option>Proyecto personalizado</option></select></label><label>Cuéntame sobre tu proyecto<textarea required rows="4" value={form.details} onChange={e=>setForm({...form,details:e.target.value})} placeholder="Fecha, tipo de sesión, idea o necesidades..."/></label><button className="button button-light" type="submit">Enviar solicitud ↗</button>{sent && <p className="success">Tu solicitud fue enviada. Gracias por contactar.</p>}</form>}
      </div></section>}
      <footer className="footer wrap"><a className="wordmark" href="#">{site?.brand_name || "RAMSS"}<span>®</span><small>FOTOGRAFÍA</small></a><p>{site?.footer_text || `© ${new Date().getFullYear()} RamsS Fotografía. Todos los derechos reservados.`}</p><a href="#top">Volver arriba ↑</a></footer>
    </main>
  );
}
