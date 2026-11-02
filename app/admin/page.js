"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Admin() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState("services");
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: "", description: "", price_from: "", price: "", category: "" });

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({data}) => setSession(data.session));
    const {data: listener} = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => { if (session) loadRows(); }, [session, tab]);

  async function loadRows() {
    const table = tab === "services" ? "services" : tab === "packages" ? "packages" : "inquiries";
    const {data, error} = await supabase.from(table).select("*").order("created_at", {ascending:false}).limit(100);
    if (error) setMessage(error.message); else setRows(data || []);
  }
  async function login(e) {
    e.preventDefault();
    const {error} = await supabase.auth.signInWithPassword({email, password});
    if (error) setMessage(error.message);
  }
  async function save(e) {
    e.preventDefault();
    const table = tab;
    const payload = tab === "services"
      ? {name:form.name, description:form.description, price_from:form.price_from, is_active:true}
      : {name:form.name, description:form.description, price:form.price ? Number(form.price) : null, category:form.category, is_active:true, features:[]};
    const {error} = await supabase.from(table).insert(payload);
    if (error) setMessage(error.message);
    else { setMessage("Guardado correctamente."); setForm({name:"",description:"",price_from:"",price:"",category:""}); loadRows(); }
  }
  async function remove(id) {
    if (!confirm("¿Eliminar este elemento?")) return;
    const {error} = await supabase.from(tab).delete().eq("id", id);
    setMessage(error ? error.message : "Elemento eliminado."); loadRows();
  }

  if (!supabase) return <div className="admin-shell"><div className="admin-box"><h1>RAMSS <i>ADMIN</i></h1><p>Configura las variables de Supabase en el archivo .env.local para activar el panel.</p></div></div>;
  if (!session) return <div className="admin-shell"><form className="admin-box" onSubmit={login}><p className="eyebrow">ÁREA PRIVADA</p><h1>RAMSS <i>ADMIN</i></h1><p>Inicia sesión para administrar tu sitio.</p><label>Correo<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Contraseña<input type="password" required value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="button button-light">Entrar</button>{message && <p>{message}</p>}<a href="/">← Volver al sitio</a></form></div>;

  return <div className="admin-layout"><aside className="admin-side"><a className="wordmark" href="/">RAMSS<span>®</span><small>ADMINISTRACIÓN</small></a><button onClick={()=>setTab("services")}>Servicios</button><button onClick={()=>setTab("packages")}>Paquetes</button><button onClick={()=>setTab("inquiries")}>Solicitudes</button><button onClick={()=>supabase.auth.signOut()}>Cerrar sesión</button><a href="/">Ver sitio ↗</a></aside><section className="admin-main"><p className="eyebrow">PANEL DE CONTROL</p><h1>{tab === "services" ? "Servicios" : tab === "packages" ? "Paquetes" : "Solicitudes"}</h1>{message && <p className="admin-message">{message}</p>}
    {tab !== "inquiries" && <form className="admin-create" onSubmit={save}><h2>Agregar {tab === "services" ? "servicio" : "paquete"}</h2><label>Nombre<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Descripción<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>{tab === "services" ? <label>Precio desde<input value={form.price_from} onChange={e=>setForm({...form,price_from:e.target.value})} placeholder="Consultar / 50"/></label> : <><label>Precio USD<input type="number" min="0" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></label><label>Categoría<input value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/></label></>}<button className="button button-dark">Guardar</button></form>}
    <div className="admin-list">{rows.map(r=><article key={r.id}><div><strong>{r.name || r.email || "Solicitud"}</strong><p>{r.description || r.details || r.service || r.email}</p></div>{tab !== "inquiries" && <button onClick={()=>remove(r.id)}>Eliminar</button>}</article>)}{!rows.length && <p>No hay registros todavía.</p>}</div></section></div>;
}
