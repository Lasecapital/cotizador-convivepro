import { useState, useCallback } from "react";

const NAVY = "#1B2E4B";
const BLUE = "#3A90D9";
const ORANGE = "#F47C20";
const LIGHT = "#F4F7FB";
const BORDER = "#D8E4F0";
const MUTED = "#6B7A94";
const GREEN = "#2ECC71";

const SERVICIOS_CATALOGO = [
  { id: "quorum_auto", nombre: "Sistema quórum y votación — Auto-gestión", categoria: "Tecnología" },
  { id: "quorum_1op", nombre: "Sistema quórum y votación — 1 Operador", categoria: "Tecnología" },
  { id: "quorum_asistido", nombre: "Sistema quórum y votación — Asistido", categoria: "Tecnología" },
  { id: "videobeam_basico", nombre: "Video beam básico", categoria: "AV" },
  { id: "videobeam_hp", nombre: "Video beam H.P.", categoria: "AV" },
  { id: "pantalla_2x2", nombre: "Pantalla 2×2", categoria: "AV" },
  { id: "pantalla_3x2", nombre: "Pantalla 3×2", categoria: "AV" },
  { id: "portatil", nombre: "Portátil", categoria: "AV" },
  { id: "sonido_basico", nombre: "Sonido básico", categoria: "AV" },
  { id: "sonido_medio", nombre: "Sonido medio", categoria: "AV" },
  { id: "sonido_grande", nombre: "Sonido grande", categoria: "AV" },
  { id: "grabacion_audio", nombre: "Grabación audio", categoria: "Registro" },
  { id: "grabacion_video", nombre: "Grabación video", categoria: "Registro" },
  { id: "transcripcion", nombre: "Transcripción", categoria: "Registro" },
  { id: "acta", nombre: "Acta", categoria: "Registro" },
  { id: "estacion_cafe", nombre: "Estación café", categoria: "Logística" },
  { id: "refrigerio_basico", nombre: "Refrigerio básico", categoria: "Logística" },
  { id: "refrigerio_medio", nombre: "Refrigerio medio", categoria: "Logística" },
  { id: "refrigerio_premium", nombre: "Refrigerio premium", categoria: "Logística" },
];

const ACTIVOS_INIT: never[] = [];

const fmt = (n: number | string) => n ? new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(n)) : "—";
const pct = (n: number) => isNaN(n) || !isFinite(n) ? "—" : n.toFixed(1) + "%";

function calcDepreciacion(valorAdq: string, valorResidual: string, vidaUtil: string, _fechaCompra?: string) {
  if (!valorAdq || !vidaUtil) return null;
  const va = parseFloat(valorAdq) || 0;
  const vr = parseFloat(valorResidual) || 0;
  const vu = parseFloat(vidaUtil) || 1;
  const depAnual = (va - vr) / vu;
  const depMensual = depAnual / 12;
  return { depAnual, depMensual };
}

let nextId = 1;
function newServicio() {
  return {
    _id: nextId++,
    servicioId: "",
    tipo: "tercerizado",
    costoProveedor: "",
    costoEquipo: "",
    precioCliente: "",
    activoId: null as number | null,
  };
}

type Servicio = ReturnType<typeof newServicio>;
type Activo = { id: number; nombre: string; valorAdq: string; valorResidual: string; vidaUtil: string; fechaCompra: string };
type Cliente = { nombre: string; contacto: string; telefono: string; correo: string; direccion: string; ciudad: string };
type HistorialEntry = { fecha: string; cliente: string; totalCliente: number; rentabilidad: string; semaforo: string };
type AnalisisIA = {
  error?: boolean;
  resumen?: string;
  optimizacion_costos?: string[];
  precio_mercado?: string;
  estrategia_rentabilidad?: string[];
  precio_recomendado?: number;
  semaforo?: string;
};

export default function App() {
  const [tab, setTab] = useState("cotizador");
  const [servicios, setServicios] = useState<Servicio[]>([newServicio()]);
  const [activos, setActivos] = useState<Activo[]>(ACTIVOS_INIT);
  const [cliente, setCliente] = useState<Cliente>({ nombre: "", contacto: "", telefono: "", correo: "", direccion: "", ciudad: "" });
  const [analisisIA, setAnalisisIA] = useState<AnalisisIA | null>(null);
  const [loadingIA, setLoadingIA] = useState(false);
  const [historial, setHistorial] = useState<HistorialEntry[]>([]);
  const [nuevoActivo, setNuevoActivo] = useState({ nombre: "", valorAdq: "", valorResidual: "", vidaUtil: "", fechaCompra: "" });

  const updateServicio = (idx: number, field: string, val: string | number | null) => {
    setServicios(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      if (field === "tipo") {
        next[idx].costoProveedor = "";
        next[idx].costoEquipo = "";
        next[idx].activoId = null;
      }
      return next;
    });
    setAnalisisIA(null);
  };

  const addServicio = () => setServicios(prev => [...prev, newServicio()]);
  const removeServicio = (idx: number) => setServicios(prev => prev.filter((_, i) => i !== idx));

  const getDepreciacion = (s: Servicio) => {
    if (s.tipo !== "propio" || !s.activoId) return null;
    const activo = activos.find(a => a.id === s.activoId);
    if (!activo) return null;
    return calcDepreciacion(activo.valorAdq, activo.valorResidual, activo.vidaUtil, activo.fechaCompra);
  };

  const getCosto = (s: Servicio) => {
    if (s.tipo === "tercerizado") return parseFloat(s.costoProveedor) || 0;
    const dep = getDepreciacion(s);
    if (dep) return dep.depMensual;
    return parseFloat(s.costoEquipo) || 0;
  };

  const totalCostos = servicios.reduce((acc, s) => acc + getCosto(s), 0);
  const totalCliente = servicios.reduce((acc, s) => acc + (parseFloat(s.precioCliente) || 0), 0);
  const margen = totalCliente - totalCostos;
  const rentabilidad = totalCliente > 0 ? (margen / totalCliente) * 100 : 0;

  const llamarIA = useCallback(async () => {
    setLoadingIA(true);
    setAnalisisIA(null);
    const items = servicios.map(s => {
      const cat = SERVICIOS_CATALOGO.find(c => c.id === s.servicioId);
      return {
        servicio: cat ? cat.nombre : "Sin seleccionar",
        tipo: s.tipo,
        costo: getCosto(s),
        precioCliente: parseFloat(s.precioCliente) || 0,
      };
    });
    const prompt = `Eres el asesor estratégico de ConVive Pro, empresa colombiana especializada en producción integral de asambleas de propiedad horizontal en Pereira y Dosquebradas.

Analiza esta cotización y entrega un JSON con exactamente esta estructura (sin markdown, sin texto extra):
{
  "optimizacion_costos": ["idea 1", "idea 2", "idea 3"],
  "precio_mercado": "párrafo corto comparando el precio total ${fmt(totalCliente)} con el mercado colombiano de producción de asambleas PH",
  "estrategia_rentabilidad": ["táctica 1", "táctica 2", "táctica 3"],
  "precio_recomendado": number,
  "semaforo": "verde|amarillo|rojo",
  "resumen": "una frase de diagnóstico ejecutivo"
}

Items cotizados: ${JSON.stringify(items)}
Total costos: ${totalCostos}
Total cliente: ${totalCliente}
Margen: ${margen}
Rentabilidad: ${rentabilidad.toFixed(1)}%

Contexto: mercado colombiano PH, Eje Cafetero. Misión: costos → 0, precios agresivos vs competencia, máxima rentabilidad.`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      const text = data.content?.map((b: { text?: string }) => b.text || "").join("") || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setAnalisisIA(parsed);

      const entrada: HistorialEntry = {
        fecha: new Date().toLocaleDateString("es-CO"),
        cliente: cliente.nombre || "Sin nombre",
        totalCliente,
        rentabilidad: rentabilidad.toFixed(1),
        semaforo: parsed.semaforo,
      };
      setHistorial(prev => [entrada, ...prev.slice(0, 9)]);
    } catch (_e) {
      setAnalisisIA({ error: true, resumen: "No se pudo obtener el análisis. Verifica tu conexión." });
    }
    setLoadingIA(false);
  }, [servicios, totalCostos, totalCliente, margen, rentabilidad, cliente]);

  const agregarActivo = () => {
    if (!nuevoActivo.nombre || !nuevoActivo.valorAdq || !nuevoActivo.vidaUtil) return;
    const id = Date.now();
    setActivos(prev => [...prev, { ...nuevoActivo, id }]);
    setNuevoActivo({ nombre: "", valorAdq: "", valorResidual: "", vidaUtil: "", fechaCompra: "" });
  };

  const semaforoColor: Record<string, string> = { verde: GREEN, amarillo: ORANGE, rojo: "#E74C3C" };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: LIGHT, minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: NAVY, padding: "0 24px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, borderRadius: "50%", background: "#243E62" }} />
        <div style={{ position: "absolute", bottom: -30, right: 60, width: 80, height: 80, borderRadius: "50%", background: "#1F3557" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: ORANGE }} />
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 0 18px", position: "relative", zIndex: 1 }}>
          <div style={{ background: "white", borderRadius: 8, padding: "6px 12px", display: "flex", alignItems: "center", gap: 2 }}>
            <span style={{ color: NAVY, fontWeight: 700, fontSize: 18 }}>Con</span>
            <span style={{ color: BLUE, fontWeight: 700, fontSize: 18 }}>Vive</span>
            <span style={{ color: ORANGE, fontWeight: 700, fontSize: 18, fontStyle: "italic" }}>Pro</span>
          </div>
          <div>
            <div style={{ color: "white", fontWeight: 600, fontSize: 15 }}>Cotizador Inteligente</div>
            <div style={{ color: "#A8C4E0", fontSize: 11 }}>Producción de Asambleas · Colombia</div>
          </div>
        </div>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, paddingBottom: 0, position: "relative", zIndex: 1 }}>
          {[["cotizador", "Cotizador"], ["activos", "Activos / Equipos"], ["historial", "Historial"]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{ background: tab === key ? "white" : "transparent", color: tab === key ? NAVY : "#A8C4E0", border: "none", borderRadius: "6px 6px 0 0", padding: "8px 16px", fontWeight: tab === key ? 600 : 400, fontSize: 13, cursor: "pointer" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "20px 24px", maxWidth: 900, margin: "0 auto" }}>

        {/* ── TAB COTIZADOR ── */}
        {tab === "cotizador" && (
          <>
            {/* Datos cliente */}
            <div style={{ background: "white", borderRadius: 10, border: `1px solid ${BORDER}`, padding: 18, marginBottom: 16 }}>
              <div style={{ color: NAVY, fontWeight: 600, fontSize: 13, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ background: BLUE, color: "white", borderRadius: 4, padding: "1px 7px", fontSize: 11 }}>CLIENTE</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[["nombre","Conjunto / Empresa *"], ["contacto","Contacto"], ["telefono","Teléfono"], ["correo","Correo"], ["ciudad","Ciudad"], ["direccion","Dirección"]].map(([f, label]) => (
                  <div key={f}>
                    <div style={{ fontSize: 11, color: MUTED, marginBottom: 3 }}>{label}</div>
                    <input value={cliente[f as keyof Cliente]} onChange={e => setCliente(p => ({ ...p, [f]: e.target.value }))}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: `1px solid ${BORDER}`, fontSize: 13, boxSizing: "border-box" }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Tabla servicios */}
            <div style={{ background: "white", borderRadius: 10, border: `1px solid ${BORDER}`, padding: 18, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ color: NAVY, fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ background: ORANGE, color: "white", borderRadius: 4, padding: "1px 7px", fontSize: 11 }}>SERVICIOS</span>
                </div>
                <button onClick={addServicio} style={{ background: BLUE, color: "white", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>+ Agregar</button>
              </div>

              {/* Cabecera */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 110px 1fr 1fr 80px", gap: 8, fontSize: 10, color: MUTED, fontWeight: 600, padding: "0 4px 6px", borderBottom: `1px solid ${BORDER}`, marginBottom: 8 }}>
                <span>SERVICIO</span><span>TIPO</span><span>COSTO</span><span>PRECIO CLIENTE</span><span></span>
              </div>

              {servicios.map((s, idx) => {
                const dep = getDepreciacion(s);
                const costoCalc = getCosto(s);
                const precio = parseFloat(s.precioCliente) || 0;
                const margenItem = precio - costoCalc;
                const rentItem = precio > 0 ? (margenItem / precio) * 100 : 0;
                return (
                  <div key={s._id} style={{ marginBottom: 8, padding: "10px 4px", borderBottom: `1px solid ${LIGHT}` }}>
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 110px 1fr 1fr 80px", gap: 8, alignItems: "start" }}>
                      {/* Servicio */}
                      <select value={s.servicioId} onChange={e => updateServicio(idx, "servicioId", e.target.value)}
                        style={{ padding: "7px 8px", borderRadius: 6, border: `1px solid ${BORDER}`, fontSize: 12, width: "100%" }}>
                        <option value="">Seleccionar…</option>
                        {["Tecnología","AV","Registro","Logística"].map(cat => (
                          <optgroup key={cat} label={cat}>
                            {SERVICIOS_CATALOGO.filter(c => c.categoria === cat).map(c => (
                              <option key={c.id} value={c.id}>{c.nombre}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>

                      {/* Tipo */}
                      <select value={s.tipo} onChange={e => updateServicio(idx, "tipo", e.target.value)}
                        style={{ padding: "7px 8px", borderRadius: 6, border: `1px solid ${BORDER}`, fontSize: 12, width: "100%" }}>
                        <option value="tercerizado">Tercerizado</option>
                        <option value="propio">Propio</option>
                      </select>

                      {/* Costo */}
                      <div>
                        {s.tipo === "tercerizado" ? (
                          <input type="number" placeholder="$ Proveedor" value={s.costoProveedor}
                            onChange={e => updateServicio(idx, "costoProveedor", e.target.value)}
                            style={{ padding: "7px 8px", borderRadius: 6, border: `1px solid ${BORDER}`, fontSize: 12, width: "100%", boxSizing: "border-box" }} />
                        ) : (
                          <div>
                            <select value={s.activoId ?? ""} onChange={e => updateServicio(idx, "activoId", e.target.value ? parseInt(e.target.value) : null)}
                              style={{ padding: "6px 8px", borderRadius: 6, border: `1px solid ${BORDER}`, fontSize: 11, width: "100%", marginBottom: 4 }}>
                              <option value="">Activo (dep.)…</option>
                              {activos.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                            </select>
                            {dep ? (
                              <div style={{ fontSize: 10, color: GREEN, fontWeight: 600 }}>Dep. mensual: {fmt(dep.depMensual)}</div>
                            ) : (
                              <input type="number" placeholder="$ Equipo" value={s.costoEquipo}
                                onChange={e => updateServicio(idx, "costoEquipo", e.target.value)}
                                style={{ padding: "6px 8px", borderRadius: 6, border: `1px solid ${BORDER}`, fontSize: 11, width: "100%", boxSizing: "border-box" }} />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Precio cliente */}
                      <input type="number" placeholder="$ Cliente" value={s.precioCliente}
                        onChange={e => updateServicio(idx, "precioCliente", e.target.value)}
                        style={{ padding: "7px 8px", borderRadius: 6, border: `1px solid ${BORDER}`, fontSize: 12, width: "100%", boxSizing: "border-box" }} />

                      {/* Acciones */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                        <button onClick={() => removeServicio(idx)}
                          style={{ background: "none", border: "none", color: "#E74C3C", cursor: "pointer", fontSize: 16, padding: "2px 6px" }}>✕</button>
                        {precio > 0 && costoCalc > 0 && (
                          <div style={{ fontSize: 10, color: rentItem >= 30 ? GREEN : rentItem >= 15 ? ORANGE : "#E74C3C", fontWeight: 600, textAlign: "right" }}>
                            {pct(rentItem)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Resumen financiero */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
              {[
                ["Total costos", fmt(totalCostos), BORDER],
                ["Total cliente", fmt(totalCliente), BLUE],
                ["Margen bruto", fmt(margen), margen >= 0 ? GREEN : "#E74C3C"],
                ["Rentabilidad", pct(rentabilidad), rentabilidad >= 30 ? GREEN : rentabilidad >= 15 ? ORANGE : "#E74C3C"],
              ].map(([label, val, color]) => (
                <div key={label} style={{ background: "white", borderRadius: 10, border: `1px solid ${BORDER}`, padding: "14px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color }}>{val}</div>
                </div>
              ))}
            </div>

            {/* Botón IA */}
            <button onClick={llamarIA} disabled={loadingIA || servicios.length === 0}
              style={{ width: "100%", background: loadingIA ? MUTED : NAVY, color: "white", border: "none", borderRadius: 10, padding: "14px", fontSize: 15, fontWeight: 700, cursor: loadingIA ? "not-allowed" : "pointer", marginBottom: 16, transition: "background 0.2s" }}>
              {loadingIA ? "⏳ Analizando con IA…" : "✦ Analizar con IA — Optimizar costos y rentabilidad"}
            </button>

            {/* Panel IA */}
            {analisisIA && !analisisIA.error && (
              <div style={{ background: "white", borderRadius: 10, border: `2px solid ${BLUE}`, padding: 20, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 14, height: 14, borderRadius: "50%", background: semaforoColor[analisisIA.semaforo ?? ""] || MUTED }} />
                  <div style={{ fontWeight: 700, color: NAVY, fontSize: 15 }}>{analisisIA.resumen}</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                  <div style={{ background: LIGHT, borderRadius: 8, padding: 14 }}>
                    <div style={{ fontWeight: 700, color: NAVY, fontSize: 12, marginBottom: 8 }}>💡 Reducción de costos</div>
                    {analisisIA.optimizacion_costos?.map((idea, i) => (
                      <div key={i} style={{ fontSize: 12, color: "#4A5568", marginBottom: 6, display: "flex", gap: 6 }}>
                        <span style={{ color: GREEN, fontWeight: 700, flexShrink: 0 }}>{i+1}.</span>{idea}
                      </div>
                    ))}
                  </div>
                  <div style={{ background: LIGHT, borderRadius: 8, padding: 14 }}>
                    <div style={{ fontWeight: 700, color: NAVY, fontSize: 12, marginBottom: 8 }}>📈 Estrategia de rentabilidad</div>
                    {analisisIA.estrategia_rentabilidad?.map((t, i) => (
                      <div key={i} style={{ fontSize: 12, color: "#4A5568", marginBottom: 6, display: "flex", gap: 6 }}>
                        <span style={{ color: ORANGE, fontWeight: 700, flexShrink: 0 }}>{i+1}.</span>{t}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: LIGHT, borderRadius: 8, padding: 14, marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, color: NAVY, fontSize: 12, marginBottom: 6 }}>🏷️ Posicionamiento en mercado colombiano</div>
                  <div style={{ fontSize: 12, color: "#4A5568" }}>{analisisIA.precio_mercado}</div>
                </div>

                {analisisIA.precio_recomendado && (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, background: NAVY, borderRadius: 8, padding: "12px 16px" }}>
                    <div style={{ color: "#A8C4E0", fontSize: 12 }}>Precio recomendado por IA</div>
                    <div style={{ color: "white", fontWeight: 700, fontSize: 20 }}>{fmt(analisisIA.precio_recomendado)}</div>
                    <button onClick={() => {
                      const ratio = (analisisIA.precio_recomendado ?? 1) / (totalCliente || 1);
                      setServicios(prev => prev.map(s => ({
                        ...s, precioCliente: s.precioCliente ? String(Math.round(parseFloat(s.precioCliente) * ratio)) : s.precioCliente
                      })));
                    }} style={{ marginLeft: "auto", background: ORANGE, color: "white", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                      Aplicar
                    </button>
                  </div>
                )}
              </div>
            )}

            {analisisIA?.error && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: 14, color: "#991B1B", fontSize: 13, marginBottom: 16 }}>
                {analisisIA.resumen}
              </div>
            )}

            {/* Botón cotización */}
            <button onClick={() => alert("Funcionalidad de generación de PDF disponible próximamente. Los datos del cliente y servicios están listos para exportar.")}
              style={{ width: "100%", background: ORANGE, color: "white", border: "none", borderRadius: 10, padding: "13px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              📄 Generar cotización formal
            </button>
          </>
        )}

        {/* ── TAB ACTIVOS ── */}
        {tab === "activos" && (
          <>
            <div style={{ background: "white", borderRadius: 10, border: `1px solid ${BORDER}`, padding: 20, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: NAVY, fontSize: 14, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ background: BLUE, color: "white", borderRadius: 4, padding: "2px 8px", fontSize: 11 }}>REGISTRAR ACTIVO</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                {[["nombre","Nombre del equipo *"], ["valorAdq","Valor de adquisición (COP) *"], ["valorResidual","Valor residual (COP)"], ["vidaUtil","Vida útil (años) *"], ["fechaCompra","Fecha de compra"]].map(([f, label]) => (
                  <div key={f}>
                    <div style={{ fontSize: 11, color: MUTED, marginBottom: 3 }}>{label}</div>
                    <input type={f === "fechaCompra" ? "date" : f === "vidaUtil" || f.startsWith("valor") ? "number" : "text"}
                      value={nuevoActivo[f as keyof typeof nuevoActivo]} onChange={e => setNuevoActivo(p => ({ ...p, [f]: e.target.value }))}
                      style={{ padding: "7px 10px", borderRadius: 6, border: `1px solid ${BORDER}`, fontSize: 13, width: "100%", boxSizing: "border-box" }} />
                  </div>
                ))}
              </div>

              {/* Preview depreciación */}
              {nuevoActivo.valorAdq && nuevoActivo.vidaUtil && (() => {
                const d = calcDepreciacion(nuevoActivo.valorAdq, nuevoActivo.valorResidual, nuevoActivo.vidaUtil);
                return d ? (
                  <div style={{ background: LIGHT, borderRadius: 8, padding: "10px 14px", marginBottom: 12, display: "flex", gap: 24 }}>
                    <div><div style={{ fontSize: 10, color: MUTED }}>Dep. anual</div><div style={{ fontWeight: 700, color: NAVY }}>{fmt(d.depAnual)}</div></div>
                    <div><div style={{ fontSize: 10, color: MUTED }}>Dep. mensual</div><div style={{ fontWeight: 700, color: GREEN }}>{fmt(d.depMensual)}</div></div>
                    <div style={{ fontSize: 11, color: MUTED, alignSelf: "center" }}>→ Este valor se usará como costo del equipo en cotizaciones</div>
                  </div>
                ) : null;
              })()}

              <button onClick={agregarActivo}
                style={{ background: NAVY, color: "white", border: "none", borderRadius: 6, padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                + Registrar activo
              </button>
            </div>

            {activos.length === 0 ? (
              <div style={{ textAlign: "center", color: MUTED, padding: 40, fontSize: 14 }}>
                No hay activos registrados. Agrega equipos propios para calcular su depreciación automáticamente.
              </div>
            ) : (
              <div style={{ background: "white", borderRadius: 10, border: `1px solid ${BORDER}`, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 40px", gap: 0, background: NAVY, padding: "10px 16px", fontSize: 11, color: "#A8C4E0", fontWeight: 600 }}>
                  <span>EQUIPO</span><span>VALOR ADQ.</span><span>V. RESIDUAL</span><span>VIDA ÚTIL</span><span>DEP. MENSUAL</span><span></span>
                </div>
                {activos.map((a, i) => {
                  const dep = calcDepreciacion(a.valorAdq, a.valorResidual, a.vidaUtil);
                  return (
                    <div key={a.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 40px", gap: 0, padding: "12px 16px", borderBottom: `1px solid ${LIGHT}`, background: i % 2 === 0 ? "white" : LIGHT, alignItems: "center" }}>
                      <span style={{ fontWeight: 600, color: NAVY, fontSize: 13 }}>{a.nombre}</span>
                      <span style={{ fontSize: 13 }}>{fmt(a.valorAdq)}</span>
                      <span style={{ fontSize: 13 }}>{fmt(a.valorResidual) || "—"}</span>
                      <span style={{ fontSize: 13 }}>{a.vidaUtil} años</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: GREEN }}>{dep ? fmt(dep.depMensual) : "—"}</span>
                      <button onClick={() => setActivos(prev => prev.filter(x => x.id !== a.id))}
                        style={{ background: "none", border: "none", color: "#E74C3C", cursor: "pointer", fontSize: 16 }}>✕</button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── TAB HISTORIAL ── */}
        {tab === "historial" && (
          <>
            {historial.length === 0 ? (
              <div style={{ textAlign: "center", color: MUTED, padding: 60, fontSize: 14 }}>
                Aún no hay cotizaciones analizadas. Usa el cotizador y haz clic en "Analizar con IA" para ver el historial aquí.
              </div>
            ) : (
              <div style={{ background: "white", borderRadius: 10, border: `1px solid ${BORDER}`, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "80px 2fr 1fr 1fr 100px", background: NAVY, padding: "10px 16px", fontSize: 11, color: "#A8C4E0", fontWeight: 600 }}>
                  <span>FECHA</span><span>CLIENTE</span><span>PRECIO TOTAL</span><span>RENTABILIDAD</span><span>ESTADO</span>
                </div>
                {historial.map((h, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "80px 2fr 1fr 1fr 100px", padding: "12px 16px", borderBottom: `1px solid ${LIGHT}`, background: i % 2 === 0 ? "white" : LIGHT, alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: MUTED }}>{h.fecha}</span>
                    <span style={{ fontWeight: 600, color: NAVY, fontSize: 13 }}>{h.cliente}</span>
                    <span style={{ fontSize: 13 }}>{fmt(h.totalCliente)}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: parseFloat(h.rentabilidad) >= 30 ? GREEN : parseFloat(h.rentabilidad) >= 15 ? ORANGE : "#E74C3C" }}>{h.rentabilidad}%</span>
                    <span>
                      <span style={{ background: (semaforoColor[h.semaforo] ?? MUTED) + "22", color: semaforoColor[h.semaforo] ?? MUTED, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>
                        {h.semaforo?.toUpperCase()}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ background: NAVY, padding: "10px 24px", marginTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#8AAAC8", fontSize: 11 }}>ConVive Pro · Servicios para Asambleas de Propiedad Horizontal</span>
        <span style={{ color: "#8AAAC8", fontSize: 11 }}>www.convivepro.co · info@convivepro.co · WhatsApp: 312 234 0998</span>
      </div>
    </div>
  );
}
