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
  const [gallery, setGallery] = useState([]);\n  const [editorialProjects, setEditorialProjects] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", service: "", details: "" });
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    (async () => {
      const [s, p, g] = await Promise.all([
        supabase.from("services").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("packages").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("gallery").select("*").eq("is_visible", true).order("sort_order")
      ]);
      if (s.data?.length) setServices(s.data);
      if (p.data) setPackages(p.data);
      if (g.data) setGallery(g.data);\n      if (g.error?.code === "42P01") {\n        const legacy = await supabase.from("gallery").select("*").eq("is_visible", true).order("sort_order");\n        if (legacy.data) setGallery(legacy.data);\n      }\n      if (arguments.length === 0 && g.data) { /* portfolio images loaded */ }\n      const projects = await supabase.from("portfolio_projects").select("*, portfolio_project_images(*)").eq("is_visible", true).order("sort_order");\n      if (projects.data) setEditorialProjects(projects.data);
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
      <nav className="nav wrap">
        <a className="wordmark" href="#">RAMSS<span>®</span><small>FOTOGRAFÍA</small></a>
        <div className="navlinks"><a href="#portfolio">Portafolio</a><a href="#services">Servicios</a><a href="#packages">Paquetes</a><a href="#contact">Contacto</a></div>
        <a className="nav-cta" href="#contact">Hablemos <span>↗</span></a>
      </nav>

      <section className="hero">
        <div className="hero-image" />
        <div className="hero-shade" />
        <div className="hero-content wrap">
          <p className="eyebrow">FOTOGRAFÍA · DIRECCIÓN CREATIVA · CONTENIDO</p>
          <h1>Imágenes que<br/><em>permanecen.</em></h1>
          <p className="hero-copy">Una mirada visual cuidada para contar historias, preservar momentos y construir identidades.</p>
          <div className="hero-actions"><a className="button button-light" href="#portfolio">Explorar portafolio <span>↗</span></a><a className="text-link" href="#contact">Solicitar una sesión</a></div>
        </div>
        <div className="hero-index">01 — 05 <span>RAMSS FOTOGRAFÍA</span></div>
      </section>

      <section className="intro wrap section-pad">
        <p className="eyebrow">EL ENFOQUE</p>
        <div><h2>La fotografía como<br/><em>lenguaje propio.</em></h2><p className="intro-text">Cada proyecto merece una intención, una estética y una historia. Trabajo desde una perspectiva visual que combina sensibilidad, composición y atención al detalle.</p></div>
      </section>

      <section id="portfolio" className="portfolio section-pad">
        <div className="wrap section-heading"><div><p className="eyebrow">SELECCIÓN DE TRABAJOS</p><h2>Portafolio<span className="gold">.</span></h2></div><p>Una selección de historias<br/>contadas a través de imágenes.</p></div>
        {(gallery.length || editorialProjects.length) ? <div className="wrap portfolio-content">
          {editorialProjects.length > 0 && <><p className="eyebrow portfolio-kicker">PROYECTOS EDITORIALES</p><div className="editorial-grid">{editorialProjects.map((project) => <article className="editorial-card" key={project.id}><a href={`#proyecto-${project.slug}`}><img src={project.cover_image_url} alt={project.title}/><div><span>{project.category}</span><h3>{project.title}</h3><p>{project.description}</p></div></a></article>)}</div>
          {editorialProjects.map((project) => <section className="editorial-detail" id={`proyecto-${project.slug}`} key={project.id}><div className="editorial-detail-heading"><div><p className="eyebrow">{project.category}</p><h3>{project.title}</h3></div><p>{project.description}</p></div><div className="editorial-images">{(project.portfolio_project_images || []).sort((a,b)=>a.sort_order-b.sort_order).map((image)=><img key={image.id} src={image.image_url} alt={image.alt_text || project.title}/>)}</div></section>)}</>}
          {gallery.length > 0 && <><p className="eyebrow portfolio-kicker">FOTOGRAFÍAS INDIVIDUALES</p><div className="gallery-grid">{gallery.map((item) => <figure className="gallery-item" key={item.id}><img src={item.image_url} alt={item.alt_text || item.title || "Fotografía de portafolio"}/><figcaption>{item.title || item.category}</figcaption></figure>)}</div></>}
        </div> : <div className="portfolio-empty wrap"><div className="empty-frame"><span>R / S</span><small>TU PRÓXIMA HISTORIA VISUAL</small></div><p>El portafolio se actualizará con tus fotografías y proyectos editoriales desde el panel de administración.</p></div>}
      </section>

      <section id="services" className="wrap section-pad">
        <div className="section-heading"><div><p className="eyebrow">QUÉ PUEDO OFRECER</p><h2>Servicios<span className="gold">.</span></h2></div><p>Soluciones visuales pensadas<br/>para cada necesidad.</p></div>
        <div className="service-grid">{services.map((s, i) => <article className="service-card" key={s.id}><span className="service-no">0{i + 1}</span><h3>{s.name}</h3><p>{s.description}</p><div className="service-bottom"><span>Desde: {s.price_from || "Consultar"}</span><a href="#contact">Consultar ↗</a></div></article>)}</div>
      </section>

      <section id="packages" className="packages section-pad">
        <div className="wrap">
          <div className="section-heading"><div><p className="eyebrow">PROPUESTAS</p><h2>Paquetes & experiencias<span className="gold">.</span></h2></div><p>Opciones claras, con la flexibilidad<br/>de crear algo a tu medida.</p></div>
          {packages.length ? <div className="package-grid">{packages.map((p) => <article className="package-card" key={p.id}><p className="eyebrow">{p.category || "PAQUETE"}</p><h3>{p.name}</h3><p>{p.description}</p><strong>{p.price ? `$${p.price} USD` : "Cotización personalizada"}</strong>{p.features?.length > 0 && <ul>{p.features.map((f, i) => <li key={i}>{f}</li>)}</ul>}<a className="button button-outline" href={`#contact`}>Consultar paquete ↗</a></article>)}</div> :
            <div className="custom-callout"><div><p className="eyebrow">HECHO A TU MEDIDA</p><h3>Tu idea merece<br/><em>una propuesta propia.</em></h3></div><p>Cuéntame qué tienes en mente y prepararé una propuesta según las características de tu proyecto.</p><a className="button button-light" href="#contact">Solicitar cotización ↗</a></div>}
        </div>
      </section>

      <section className="about wrap section-pad"><div className="about-mark">R<span>/</span>S</div><div><p className="eyebrow">DETRÁS DE LA CÁMARA</p><h2>Hola, soy<br/><em>Ramses.</em></h2><p>Fotógrafo enfocado en crear imágenes con identidad, intención y cuidado por los detalles. Este espacio reúne mi trabajo y las distintas formas en las que puedo ayudarte a contar tu historia.</p><a className="text-link" href="https://www.instagram.com/ramssfotografia/" target="_blank" rel="noreferrer">Conoce mi trabajo en Instagram ↗</a></div></section>

      <section id="contact" className="contact section-pad"><div className="wrap contact-grid"><div><p className="eyebrow">EMPECEMOS ALGO</p><h2>Hablemos de<br/><em>tu proyecto.</em></h2><p className="contact-copy">Cuéntame qué necesitas. Te responderé para conversar sobre disponibilidad, ideas y presupuesto.</p><div className="contact-links"><a href="https://www.instagram.com/ramssfotografia/" target="_blank" rel="noreferrer">Instagram ↗</a><a href="https://wa.me/" target="_blank" rel="noreferrer">WhatsApp ↗ <small>(configurar número)</small></a></div></div>
        <form className="contact-form" onSubmit={submitInquiry}><label>Nombre<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Tu nombre"/></label><label>Correo electrónico<input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="correo@ejemplo.com"/></label><label>Servicio de interés<select value={form.service} onChange={e=>setForm({...form,service:e.target.value})}><option value="">Selecciona un servicio</option>{services.map(s=><option key={s.id}>{s.name}</option>)}<option>Proyecto personalizado</option></select></label><label>Cuéntame sobre tu proyecto<textarea required rows="4" value={form.details} onChange={e=>setForm({...form,details:e.target.value})} placeholder="Fecha, tipo de sesión, idea o necesidades..."/></label><button className="button button-light" type="submit">Enviar solicitud ↗</button>{sent && <p className="success">Tu solicitud fue enviada. Gracias por contactar.</p>}</form>
      </div></section>
      <footer className="footer wrap"><a className="wordmark" href="#">RAMSS<span>®</span><small>FOTOGRAFÍA</small></a><p>© {new Date().getFullYear()} RamsS Fotografía. Todos los derechos reservados.</p><a href="#top">Volver arriba ↑</a></footer>
    </main>
  );
}
